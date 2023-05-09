use thiserror::Error;
#[derive(Error, Debug)]
#[non_exhaustive]
pub enum AppError {
    #[error("Cannot init log: {0}")]
    InitLoggerError(String),
}
