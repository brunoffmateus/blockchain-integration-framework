mod common;
use anyhow::Result;
use log::info;
use crate::common::setup;
use adaptor_signature_escrowed_timelock_helper::utils::mod_exp;
use ethers::types::U256;

#[test]
fn test_mod_exp_normal() -> Result<()> {
    setup();
    // base
    let generator = U256::from(11_u32);
    let exponent: U256 = U256::from(43_u32);
    let modulus = U256::from(100_u32);
    

    let result: U256 = mod_exp::modular_exponent(generator,exponent,modulus);
    info!("result: {}", result);
    assert!(result == U256::from(31));
    Ok(())
}

#[test]
fn test_mod_exp_big_generator() -> Result<()> {
    setup();
    let base: u128 = 2; 
    let generator = U256::from(base.pow(127));
    let exponent: U256 = U256::from(2_u32);
    let modulus = U256::from(100_u32);
    

    let result: U256 = mod_exp::modular_exponent(generator,exponent,modulus);
    info!("result: {}", result);
    assert!(result == U256::from(84));
    Ok(())
}

#[test]
fn test_mod_exp_big_mod() -> Result<()> {
    setup();
    let exponent = U256::from(539);
    let generator: U256 = U256::from(100100100);
    let modulus = U256::from(97853453);
    

    let result: U256 = mod_exp::modular_exponent(generator,exponent,modulus);
    info!("result: {}", result);
    assert!(result == U256::from(3762530));
    Ok(())
}
