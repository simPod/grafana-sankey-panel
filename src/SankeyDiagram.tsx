import * as d3All from 'd3';
import * as d3Sankey from 'd3-sankey';
import { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey';

import React from 'react';
import { decimalSIPrefix } from './symbolFormatters';

const d3 = {
  ...d3All,
  ...d3Sankey,
};

interface Dimensions {
  width: number;
  height: number;
}

interface SankeyDataNode {
  id: string;
  label: string;
}

export type SankeyDataNodes = { [key: string]: SankeyDataNode };

interface SankeyDiagramProps {
  dimensions: Dimensions;
  sankey: Graph;
}

interface RectProps {
  dimensions: Dimensions;
  index: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  name: string;
  value: number;
  length: number;
  colors: (t: number) => string;
}

interface LinkProps {
  data: Link;
  length: number;
  width: number;
  colors: (t: number) => string;
}

export interface NodeExtraProperties {
  id: string;
  label: string;
}

export interface LinkExtraProperties {
  source: Node;
  target: Node;
}

export type Link = SankeyLink<NodeExtraProperties, LinkExtraProperties>;
type Node = SankeyNode<NodeExtraProperties, LinkExtraProperties>;

export type Graph = SankeyGraph<NodeExtraProperties, LinkExtraProperties>;

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({ sankey, dimensions }) => {
  const colors = d3.interpolateWarm;

  const { links, nodes } = sankey;
  return (
    <svg width={dimensions.width} height={dimensions.height}>
      <g>
        {links.map((link, i) => (
          <LinkElement key={i} data={link} width={link.width!} length={nodes.length} colors={colors} />
        ))}
      </g>
      <g>
        {nodes.map(node => (
          <Rect
            key={node.index}
            dimensions={dimensions}
            index={node.index!}
            x0={node.x0!}
            x1={node.x1!}
            y0={node.y0!}
            y1={node.y1!}
            name={node.label}
            value={node.value!}
            length={nodes.length}
            colors={colors}
          />
        ))}
      </g>
    </svg>
  );
};

const Rect: React.FC<RectProps> = ({ dimensions, index, x0, x1, y0, y1, name, value, length, colors }) => {
  return (
    <>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={colors(index / length)} data-index={index} />
      <text
        x={x0 < dimensions.width / 2 ? x1 + 6 : x0 - 6}
        y={(y1 + y0) / 2}
        style={{
          fill: 'white',
          alignmentBaseline: 'middle',
          fontSize: 10,
          textAnchor: x0 < dimensions.width / 2 ? 'start' : 'end',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {name} {decimalSIPrefix('bps')(value, undefined, undefined)}
      </text>
    </>
  );
};

const LinkElement: React.FC<LinkProps> = ({ data, width, length, colors }) => {
  const d = d3.sankeyLinkHorizontal()(data);
  if (d === null) {
    throw new Error();
  }

  return (
    <>
      <defs>
        <linearGradient id={`gradient-${data.index}`} gradientUnits="userSpaceOnUse" x1={data.source.x1} x2={data.target.x0}>
          <stop offset="0" stopColor={colors(data.source.index! / length)} />
          <stop offset="100%" stopColor={colors(data.target.index! / length)} />
        </linearGradient>
      </defs>
      <path d={d} fill={'none'} stroke={`url(#gradient-${data.index})`} strokeOpacity={0.5} strokeWidth={width} />
    </>
  );
};
