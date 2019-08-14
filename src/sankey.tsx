import { PanelProps } from '@grafana/ui';
import * as d3All from 'd3';
import * as d3Sankey from 'd3-sankey';
import { cloneDeep, debounce, isUndefined } from 'lodash';
import * as React from 'react';
import { Graph, Link, LinkExtraProperties, NodeExtraProperties, SankeyDataNodes, SankeyDiagram } from './SankeyDiagram';

const d3 = {
  ...d3All,
  ...d3Sankey,
};

type timestamp = number;
type DataNodes = { [id: string]: DataNode };
type DataLinksPerTime = { [rawTimestamp: string]: DataLink[] };

interface DataResponse {
  nodes: DataNodes;
  links: DataLinksPerTime;
}

interface DataLink {
  source: string;
  target: string;
  value: number;
}

interface DataNode {
  id: string;
  label: string;
}

type SankeyPerTime = Map<timestamp, Graph>;

export const Sankey: React.FC<PanelProps> = props => {
  const [sankeysPerTime, setSankeysPerTime] = React.useState<SankeyPerTime | null>(null);
  const [hoveredTime, setHoveredTime] = React.useState<number | null>(null);
  const { data: grafanaData, height, width } = props;

  if (grafanaData.state === 'Error') {
    return <div>Error</div>;
  }

  const onHoveredTimeChanged = debounce((e: CustomEvent) => {
    const panelsHoveredTime = e.detail.time;
    if (isUndefined(hoveredTime)) {
      return;
    }

    setHoveredTime(panelsHoveredTime);
  }, 100);

  React.useEffect(
    () =>
      window.addEventListener(
        'hovered-time-changed',
        (onHoveredTimeChanged as any) as EventListener // https://github.com/Microsoft/TypeScript/issues/28357
      ),
    []
  );

  React.useEffect(
    () => () => {
      window.removeEventListener('hovered-time-changed', (onHoveredTimeChanged as any) as EventListener);
    },
    []
  );

  React.useEffect(() => {
    if (grafanaData.series.length !== 1) {
      throw new Error('Expected one series');
    }

    const createSankey = d3
      .sankey<NodeExtraProperties, LinkExtraProperties>()
      .nodeId(node => node.id)
      .nodeAlign(d3.sankeyRight)
      .nodeWidth(5)
      .nodePadding(20)
      .extent([[0, 10], [width, height - 10]]);

    const data: DataResponse = (grafanaData.series[0].rows as any) as DataResponse;

    const sankeysPerTime = new Map();

    Object.entries(data.links).forEach(([timestamp, links]) => {
      sankeysPerTime.set(parseInt(timestamp, 10), createSankey({ nodes: getNodesForLinks(data.nodes, links), links: cloneDeep(links as Link[]) }));
    });

    setSankeysPerTime(sankeysPerTime);
  }, [grafanaData.series, width, height]);

  if (sankeysPerTime === null) {
    return <span>Initializing data</span>;
  }

  const time = hoveredTime === null ? Array.from(sankeysPerTime.keys()).pop()! : hoveredTime / 1000;
  const sankey = sankeysPerTime.get(time);
  if (isUndefined(sankey)) {
    return <>¯\_(ツ)_/¯</>;
  }

  return (
    <>
      <SankeyDiagram sankey={sankey} dimensions={{ width, height }} />
    </>
  );
};

const getNodesForLinks = (nodes: DataNodes, links: DataLink[]) => {
  const linkIds = new Set();
  for (const link of Object.values(links)) {
    linkIds.add(link.source);
    linkIds.add(link.target);
  }

  return cloneDeep(
    Object.values(
      Object.keys(nodes)
        .filter(key => linkIds.has(key))
        .reduce<SankeyDataNodes>((acc, key) => {
          acc[key] = nodes[key];

          return acc;
        }, {})
    )
  );
};
