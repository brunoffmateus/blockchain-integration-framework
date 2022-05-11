import { LedgerType } from "@hyperledger/cactus-core-api";

export function calculateGasPriceBesu(
  gasPrice: string | number | undefined,
  gasUsed: string | number | undefined,
): number {
  if (!gasPrice) {
    return 0;
  }
  if (!gasUsed) {
    return 0;
  }
  return ((gasPrice as unknown) as number) * ((gasUsed as unknown) as number);
}

export function calculateCarbonFootPrintFabric(
  peers: string[] | undefined,
): number {
  if (!peers) {
    return 0;
  }
  return peers.length * CarbonFootPrintConstants(LedgerType.Fabric2);
}
export function calculateCarbonFootPrintBesu(): number {
  return CarbonFootPrintConstants(LedgerType.Besu2X);
}

export const CarbonFootPrintConstants = (ledger: LedgerType): number => {
  switch (ledger) {
    case LedgerType.Besu2X:
      return 200;

    case LedgerType.Fabric2:
      return 200;
    default:
      return 0;
  }
};
