// @ts-ignore
import { PanelPlugin } from '@grafana/data';
import { Sankey } from './sankey';

export const plugin = new PanelPlugin(Sankey);
