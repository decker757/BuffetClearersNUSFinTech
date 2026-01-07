import xrpl from "xrpl";

let client = null;

export async function connectXRPL(){
    if (!client) {
        client = new xrpl.Client(process.env.XRPL_NETWORK);
    }
    if (!client.isConnected()){
        await client.connect();
        console.log("Connected to XRPL");
    }
    return client;
}

export function getClient() {
    return client;
}