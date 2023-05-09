// deploy contract?
// todo call contract
use ethers::abi::Contract;
/*
async fn call_smart_contract() -> Result<(), Box<dyn std::error::Error>> {
    // Create a provider (e.g., connecting to a local Ethereum node or a service like Infura)
    let provider = Provider::<Http>::try_from("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID")?;

    // Signer for sending transactions (replace with your private key)
    let wallet: LocalWallet = "YOUR_PRIVATE_KEY".parse()?;

    // Connect the wallet to the provider
    let wallet = wallet.connect(provider);

    // Contract address and ABI JSON
    let contract_address: Address = "YOUR_CONTRACT_ADDRESS".parse()?;
    let abi_json = r#"YOUR_CONTRACT_ABI_JSON"#;

    // Instantiate the contract
    let contract = Contract::new(contract_address, abi_json.parse()?, wallet);

    // Serialized public key and signature (replace with your actual values)
    let serialized_public_key = "SERIALIZED_PUBLIC_KEY";
    let serialized_signature = "SERIALIZED_SIGNATURE";

    // Call the smart contract function
    let tx = contract
        .call("myFunction", (serialized_public_key, serialized_signature), None, None)
        .await?;

    // Handle the response (if the function returns a value)
    // let response: YourExpectedType = tx.await?;

    println!("Transaction sent: {:?}", tx);

    Ok(())
}
*/