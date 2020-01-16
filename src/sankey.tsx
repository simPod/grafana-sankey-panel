import { PanelProps } from '@grafana/data';
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

export const Sankey: React.FC<PanelProps> = ({ data, height, width }) => {
  const [sankeysPerTime, setSankeysPerTime] = React.useState<SankeyPerTime | null>(null);
  const [hoveredTime, setHoveredTime] = React.useState<number | null>(null);

  if (data.state === 'Error') {
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
        'click-time-changed',
        (onHoveredTimeChanged as any) as EventListener // https://github.com/Microsoft/TypeScript/issues/28357
      ),
    []
  );

  React.useEffect(
    () => () => {
      window.removeEventListener('click-time-changed', (onHoveredTimeChanged as any) as EventListener);
    },
    []
  );

  // const grafanaData = data as unknown as TableData;
  React.useEffect(() => {
    if (data.series.length !== 1) {
      throw new Error('Expected one series');
    }

    const createSankey = d3
      .sankey<NodeExtraProperties, LinkExtraProperties>()
      .nodeId(node => node.id)
      .nodeAlign(d3.sankeyRight)
      .nodeSort((a, b) => b.value! - a.value!)
      .nodeWidth(5)
      .nodePadding(20)
      .extent([
        [0, 10],
        [width, height - 10],
      ]);

    const sankeyData = (data.series[0].fields[0].values.get(0) as unknown) as DataResponse;

    const sankeysPerTime = new Map();

    Object.entries(sankeyData.links).forEach(([timestamp, links]) => {
      sankeysPerTime.set(
        parseInt(timestamp, 10),
        createSankey({
          nodes: getNodesForLinks(sankeyData.nodes, links),
          links: cloneDeep(links as Link[]),
        })
      );
    });

    setSankeysPerTime(sankeysPerTime);
  }, [data.series, width, height]);

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
