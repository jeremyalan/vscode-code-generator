import { TemplateConfiguration } from "./templateConfiguration";

export interface Generator {
    source: string;
    template: TemplateConfiguration;
}