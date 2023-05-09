use anyhow::{Context, Result};
use log::LevelFilter;
use std::str::FromStr;

use crate::error::AppError;

pub fn init_logger() -> Result<(), AppError> {
    simple_logger::init_with_env()
        .map_err(|e| AppError::InitLoggerError(e.to_string()))
}
