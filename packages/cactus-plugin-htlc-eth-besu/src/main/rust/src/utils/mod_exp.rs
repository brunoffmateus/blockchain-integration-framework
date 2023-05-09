use ethers::types::U256;
use anyhow::Result;

// source https://rustp.org/number-theory/modular-exponentiation/
// operates in o(log n) and constant space
pub fn modular_exponent(mut n: U256 ,mut x:U256 , p:U256) -> U256{
    let mut ans = U256::from(1);
    if x <= U256::from(0) { return U256::from(1); }
    loop {
        if x == U256::from(1) { return (ans * n) % p; }
        if x & U256::from(1) == U256::from(0) { n = ( n * n ) % p; x >>= U256::from(1) ; continue; }
        else { ans = (ans*n) % p; x-= U256::from(1); }
    }
}

