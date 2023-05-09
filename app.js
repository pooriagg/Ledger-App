import { ethers } from "ethers";
import Web3 from "web3";
import TransportWebHID from "@ledgerhq/hw-transport-webhid";
import Ethereum from "@ledgerhq/hw-app-eth";

const Alchemy = "https://polygon-mumbai.g.alchemy.com/v2/7d3CawiE6tv5NwqMVvTCyrVL6jGRiK8X";
const ethersProvider = new ethers.providers.JsonRpcProvider(Alchemy);
const web3 = new Web3(
    new Web3.providers.HttpProvider(Alchemy)
);

let eth;
let from;

window.addEventListener("load", async () => {
    window.document.getElementById("connect").addEventListener("click", async () => {
        await TransportWebHID.create().then(async transport => {
            eth = new Ethereum(transport);

            await eth.signPersonalMessage("44'/60'/0'/0/0", Buffer.from(
                "By using our product your are agree with our terms of service (test!)"
            ).toString("hex")).then(async msgSig => {
                const msgSigHash = "0x" + msgSig.r + msgSig.s + msgSig.v.toString(16);
                console.warn(`Signature => ${msgSigHash}`);

                let btn = window.document.getElementById("connect");

                await eth.getAddress("44'/60'/0'/0/0", true).then(async ({ address }) => {
                    console.log(`Connected account - ${address}`);
    
                    btn.innerText = `Your Address - ${address}`;
                    btn.classList.remove("btn-warning");
                    btn.classList.add("btn-success");
    
                    from = address;
    
                    console.log(
                        web3.utils.fromWei(
                            await web3.eth.getBalance(from),
                            "ether"
                        ) + " Matic"
                    );
    
                    return await init();
                }).catch(() => {
                    btn.classList.remove("btn-warning");
                    btn.classList.add("btn-danger");
    
                    console.warn("Failed to fetch user address");
                });
            }).catch(() => {
                console.error("You must signn the message to continue.");
            });
        }).catch(() => {
            console.warn("Access denied !");
        });
    });
});

const init = async () => {
    console.log("Connected!");

    window.document.getElementById("send").addEventListener("click", async () => {
        try {
            const feeData = await ethersProvider.getFeeData();

            const chainId = 80001; //! Must be number
            let to = String(window.document.getElementById("to").value);
            let value = Number(window.document.getElementById("value").value);
            let data = String(window.document.getElementById("data").value);
            let nonce = web3.utils.numberToHex(
                await web3.eth.getTransactionCount(from)
            );
            let gas;
    
            let maxPriorityFeePerGas = feeData["maxPriorityFeePerGas"]; //? For type-2 tx (EIP-1559)
            let maxFeePerGas = feeData["maxFeePerGas"]; //? For type-2 tx (EIP-1559)
    
            let gasPrice = web3.utils.numberToHex(
                await web3.eth.getGasPrice()
            ); //? For type-0 (legacy) tx
    
            if (
                !web3.utils.isAddress(to) ||
                typeof value === NaN ||
                !data.startsWith("0x")
            ) {
                console.error("Invalid data entered!");
                return null;
            };
    
            value = web3.utils.numberToHex(
                web3.utils.toWei(
                    String(value),
                    "ether"
                )
            );
    
            gas = web3.utils.numberToHex(
                await web3.eth.estimateGas(
                    {
                        from,
                        to,
                        value,
                        data
                    }
                )
            );
    
            const TX = {
                to,
                chainId,
                value,
                data,
                gasLimit: gas,
                maxPriorityFeePerGas,
                maxFeePerGas,
                nonce,
                type: 2
            };
    
            const unsignedRawTx = ethers.utils.serializeTransaction(TX).substring(2);
    
            const signature = await eth.signTransaction("44'/60'/0'/0/0", unsignedRawTx);
    
            //! Parse the signature
            signature.r = "0x" + signature.r;
            signature.s = "0x" + signature.s;
            signature.v = parseInt("0x" + signature.v);
            signature.from = from;
            //!
    
            const signedRawTx = ethers.utils.serializeTransaction(TX, signature);
    
            const txReceipt = await web3.eth.sendSignedTransaction(signedRawTx);
    
            console.log('Tx =>', txReceipt);
        } catch (e) {
            console.error("Error occured while sending the transaction !\n", e);
        };
    });
};
