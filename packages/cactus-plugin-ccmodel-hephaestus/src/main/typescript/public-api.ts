export {
  CcModelHephaestus,
  IPluginCcModelHephaestusOptions,
  IWebAppOptions,
} from "./plugin-ccmodel-hephaestus";

export { PluginFactoryWebService } from "./plugin-factory-ccmodel-hephaestus";
export { CrossChainModelType } from "./models/crosschain-model";

import { IPluginFactoryOptions } from "@hyperledger/cactus-core-api";
import { PluginFactoryWebService } from "./plugin-factory-ccmodel-hephaestus";

export async function createPluginFactory(
  pluginFactoryOptions: IPluginFactoryOptions,
): Promise<PluginFactoryWebService> {
  return new PluginFactoryWebService(pluginFactoryOptions);
}
