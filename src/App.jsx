import './App.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';
import dagre from 'dagre';

// importing components
import { nodeTypes } from './components/Nodes';
import { edgeTypes } from './components/Edges';

const initialNodes = [
  {
    id: 'start',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { label: 'User is added' },
  },
];
const initialEdges = [];

// auto layout

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// Helper function to get node dimensions
const getNodeDimensions = (node) => {
  const defaultDimensions = { width: 172, height: 56 };

  // You might want to adjust these values based on your actual node sizes
  const typeDimensions = {
    start: { width: 90, height: 30 },
    email: { width: 180, height: 60 },
    delay: { width: 120, height: 60 },
    condition: { width: 60, height: 60 },
  };

  return typeDimensions[node.type] || defaultDimensions;
};

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node);
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const { width, height } = getNodeDimensions(node);

    const newNode = {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
      anchorPoint: { x: 0.5, y: 0.5 },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

function Editor() {
  const { fitView } = useReactFlow();
  const layoutApplied = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const isNodesDeleted = useRef(false);
  const isEdgesDeleted = useRef(false);
  const { x, y, zoom } = useViewport(); // Get current viewport
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 }); // Store drag start position

  const isConnectedToStart = (nodeId, visited = new Set(), pEdges) => {
    if (nodeId === 'start') return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const incomingEdges = pEdges.filter((edge) => edge.target === nodeId);
    return incomingEdges.some((edge) =>
      isConnectedToStart(edge.source, visited, pEdges)
    );
  };

  const updateAllNodes = (pNodes = nodes, pEdges = edges) => {
    return nodes.map((node) => {
      // Update a single node color based on connection to start
      const updatedNode = updateNodeColor(node.id, nodes, pEdges);
      // Since `updateNodeColor` is returning an array, extract the updated node
      return updatedNode.find((n) => n.id === node.id);
    });
  };

  const updateAllEdges = (pEdges = edges) => {
    return pEdges.map((edge) => {
      const updatedEdges = updateEdgeColor(edge.source, edge.target, pEdges);
      return updatedEdges.find((e) => e.id === edge.id);
    });
  };

  const updateNodeColor = (nodeId, pNodes, pEdges) => {
    console.log('update node color');

    return pNodes.map((node) => {
      if (node.id === nodeId) {
        const isConnected = isConnectedToStart(nodeId, new Set(), pEdges);

        return {
          ...node,
          style: {
            ...node.style,
            background: isConnected ? 'green' : 'red',
          },
        };
      }
      return node;
    });
  };

  const updateEdgeColor = (source, target, pEdges) => {
    return pEdges.map((edge) => {
      if (edge.source === source && edge.target === target) {
        const isSourceConnected = isConnectedToStart(
          edge.source,
          new Set(),
          pEdges
        );
        const isTargetConnected = isConnectedToStart(
          edge.target,
          new Set(),
          pEdges
        );
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: isSourceConnected || isTargetConnected ? 'green' : 'red',
          },
        };
      }
      return edge;
    });
  };

  const onConnect = useCallback(
    (params) => {
      // Connection rules
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (
        (sourceNode.type === 'start' &&
          ['delay', 'email'].includes(targetNode.type)) ||
        (sourceNode.type === 'delay' &&
          ['email', 'condition'].includes(targetNode.type)) ||
        (sourceNode.type === 'email' && ['delay'].includes(targetNode.type)) ||
        (sourceNode.type === 'condition' && targetNode.type === 'email')
      ) {
        let tempEdges = addEdge(
          {
            ...params,
            type: 'smoothstep',
            style: { strokeWidth: 2, stroke: 'black' },
          },
          edges
        );
        // instead of checking the source and target I need to check all the nodes if there are two graphs joined then
        // all the trailing nodes will get connected to the start
        let tempNodes = updateAllNodes(nodes, tempEdges);
        tempEdges = updateAllEdges(tempEdges);
        setEdges(tempEdges);
        setNodes(tempNodes);
      } else {
        if (
          sourceNode.type === 'start' &&
          !['delay', 'email'].includes(targetNode.type)
        ) {
          alert(
            'A "start" node can only connect to a "delay" or "email" node.'
          );
        }
        if (
          sourceNode.type === 'delay' &&
          !['email', 'condition'].includes(targetNode.type)
        ) {
          alert(
            'A "delay" node can only connect to an "email" or "condition" node.'
          );
        }
        if (
          sourceNode.type === 'email' &&
          !['delay'].includes(targetNode.type)
        ) {
          alert('An "email" node can only connect to a "delay" node.');
        }
        if (sourceNode.type === 'condition' && targetNode.type !== 'email') {
          alert('A "condition" node can only connect to an "email" node.');
        }
      }
    },
    [nodes, setEdges, updateEdgeColor, updateNodeColor, edges, setNodes]
  );

  const onBeforeDelete = useCallback(
    ({ nodes: nodesToBeDeleted, edges: edgesToBeDeleted }) => {
      // apply changes to nodes
      let newNodesToBeDeleted = nodesToBeDeleted.filter(
        ({ id }) => !(id === 'start')
      );

      return {
        nodes: newNodesToBeDeleted,
        edges: edgesToBeDeleted,
      };
    },
    [nodes, edges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const reactFlowBounds = document
        .querySelector('.container')
        .getBoundingClientRect();

      // Calculate the mouse position relative to the canvas
      const dropPosition = {
        x: (event.clientX - reactFlowBounds.left - x) / zoom,
        y: (event.clientY - reactFlowBounds.top - y) / zoom,
      };

      const newNode = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position: dropPosition, // Use the transformed position
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [nodes, setNodes, x, y, zoom]
  );

  const onDragStart = useCallback((event, type) => {
    event.dataTransfer.setData('application/reactflow', type);
    // Get the mouse position at drag start
    setDragStartPosition({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const onLayout = useCallback(() => {
    console.log('on layout');

    // Check connectivity and update node colors
    const updatedNodes = nodes.map((node) => {
      if (node.id === 'start')
        return {
          ...node,
          data: {
            ...node.data,
            background: '#90EE90', // Light green for connected, light red for unconnected
          },
        }; // Skip the start node
      const isConnected = isConnectedToStart(node.id, new Set(), edges);
      return {
        ...node,
        data: {
          ...node.data,
          background: isConnected ? '#90EE90' : '#FFB6C1', // Light green for connected, light red for unconnected
        },
      };
    });

    // Update edge colors
    const updatedEdges = edges.map((edge) => {
      const isSourceConnected = isConnectedToStart(
        edge.source,
        new Set(),
        edges
      );
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isSourceConnected || isTargetConnected ? 'green' : 'red',
        },
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      updatedNodes,
      updatedEdges,
      'TB'
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    // render all the layouted nodes in center
    layoutApplied.current = true;
  }, [nodes, edges]);

  const handleNodesChange = useCallback(
    (changes) => {
      let isLocalDeleted = false;
      changes.forEach(({ type }) => {
        if (type === 'remove') isLocalDeleted = true;
      });
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds);
        if (isLocalDeleted) isNodesDeleted.current = true;
        return updatedNodes;
      });
    },
    [nodes, edges]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      let isLocalDeleted = false;
      changes.forEach(({ type }) => {
        if (type === 'remove') isLocalDeleted = true;
      });
      setEdges((eds) => {
        const edgesAfterChangesApplied = applyEdgeChanges(changes, eds);
        if (isLocalDeleted) isEdgesDeleted.current = true;
        return edgesAfterChangesApplied;
      });
    },
    [nodes, edges]
  );

  useEffect(() => {
    if (isEdgesDeleted.current && isNodesDeleted.current) {
      console.log('After deletion fresh state');
      let tempNodes = updateAllNodes(nodes, edges);
      let tempEdges = updateAllEdges(edges);
      setEdges(tempEdges);
      setNodes(tempNodes);
      isEdgesDeleted.current = false;
      isNodesDeleted.current = false;
    }
  }, [nodes, edges]);

  // makes sure on save fitview function runs after all the nodes are placed.
  useEffect(() => {
    if (layoutApplied.current) {
      fitView();
      layoutApplied.current = false;
    }
  }, [nodes, fitView]);

  return (
    <div className="main-container">
      <div className="container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ strokeWidth: 2, stroke: 'black' }}
          onBeforeDelete={onBeforeDelete}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ maxZoom: 0.75 }}
        >
          {/* <Panel position="top-right">
          <div className="panel">Top right</div>
        </Panel> */}
          <Controls />
          <MiniMap zoomable pannable />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>
      <div className="side-container">
        <h4>Components</h4>
        <div
          className="node"
          onDragStart={(event) => onDragStart(event, 'delay')}
          draggable
        >
          Delay Node
        </div>
        <div
          className="node"
          onDragStart={(event) => onDragStart(event, 'email')}
          draggable
        >
          Email Node
        </div>
        <div
          className="node"
          onDragStart={(event) => onDragStart(event, 'condition')}
          draggable
        >
          Condition Node
        </div>
        <button onClick={() => onLayout()}>Save</button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}

export default App;
