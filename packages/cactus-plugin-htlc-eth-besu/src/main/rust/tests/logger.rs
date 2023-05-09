
use adaptor_signature_escrowed_timelock_helper::utils::logger;
use log::{debug, error, info, trace, warn};
use std::env;

use crate::common::{setup};
mod common;

#[test]
fn setup_env_log_from_env_example() {
    logger::init_logger().unwrap();
    error!("An error!");
    warn!("A warning!");
    info!("Info!");
    debug!("Debug!");
}
