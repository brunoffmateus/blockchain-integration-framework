use anyhow::Result;
use adaptor_signature_escrowed_timelock_helper::utils::logger;

#[allow(dead_code)]
fn setup_dot_env_example() {
    dotenv::from_filename(".env.example").ok();
}

#[allow(dead_code)]
pub fn setup() {
    logger::init_logger().ok();
    setup_dot_env_example();
}
