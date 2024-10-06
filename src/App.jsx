/* eslint-disable no-unused-vars */
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
import { v4 as uuidv4 } from 'uuid';

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
  const { fitView, } = useReactFlow();
  const [rfInstance, setRfInstance] = useState(null);
  const layoutApplied = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const isNodesDeleted = useRef(false);
  const isEdgesDeleted = useRef(false);
  const { x, y, zoom } = useViewport(); // Get current viewport
  // const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 }); // Store drag start position

  const isConnectedToStart = useCallback((nodeId, visited = new Set(), pEdges) => {
    if (nodeId === 'start') return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const incomingEdges = pEdges.filter((edge) => edge.target === nodeId);
    return incomingEdges.some((edge) =>
      isConnectedToStart(edge.source, visited, pEdges)
    );
  }, []);

  const updateNodeColor = useCallback((nodeId, pNodes, pEdges) => {
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
  }, [isConnectedToStart]);

  const updateAllNodes = useCallback((pNodes = nodes, pEdges = edges) => {
    return pNodes.map((node) => {
      // Update a single node color based on connection to start
      const updatedNode = updateNodeColor(node.id, nodes, pEdges);
      // Since `updateNodeColor` is returning an array, extract the updated node
      return updatedNode.find((n) => n.id === node.id);
    });
  }, [edges, nodes, updateNodeColor]);

  const updateEdgeColor = useCallback((source, target, pEdges) => {
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
  }, [isConnectedToStart]);

  const updateAllEdges = useCallback((pEdges = edges) => {
    return pEdges.map((edge) => {
      const updatedEdges = updateEdgeColor(edge.source, edge.target, pEdges);
      return updatedEdges.find((e) => e.id === edge.id);
    });
  }, [edges, updateEdgeColor]);

  const onConnect = useCallback(
    (params) => {
      // Connection rules
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (
        (sourceNode.type === 'start' &&
          ['delay', 'email'].includes(targetNode.type)) ||
        (sourceNode.type === 'delay' &&
          ['email', 'condition', 'delay'].includes(targetNode.type)) ||
        (sourceNode.type === 'email' && ['delay'].includes(targetNode.type)) ||
        (sourceNode.type === 'condition' && ['delay', 'email'].includes(targetNode.type))
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
    [nodes, edges, updateAllNodes, updateAllEdges, setEdges, setNodes]
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
    []
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
    // setDragStartPosition({
    //   x: event.clientX,
    //   y: event.clientY,
    // });
  }, []);

  const onLayout = useCallback(() => {

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
      const isTargetConnected = isConnectedToStart(
        edge.target,
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
  }, [nodes, edges, setNodes, setEdges, isConnectedToStart]);

  const onPublish = () => {
    // check for nodes that are not connected to start trigger

    let isConnectedToStartCheck = true
    let containsAtleastOneEmail = false

    nodes.forEach((node) => {
      const isConnected = isConnectedToStart(node.id, new Set(), edges);
      if (!isConnected) {
        isConnectedToStartCheck = false
      }
      if (node.type === "email") {
        containsAtleastOneEmail = true
      }
    })

    if (!isConnectedToStartCheck) {
      alert("Cannot Save: Some nodes are not connected to start")
      return
    }

    if (!containsAtleastOneEmail) {
      alert("Cannot Save: Must have atleast one email on trigger")
      return
    }

    // saving the instance
    if (rfInstance) {
      const flow = rfInstance.toObject()
      // console.log(flow)
    }

    console.log(nodes, edges)

    // Generate the JSON output
    // Current issue is that is push the node inside the array even if it is nested. 


    let emails = [];
    // let emailId = 1;

    const getNextNode = (nodeId) => {
      const outgoingEdge = edges.find(e => e.source === nodeId);
      return outgoingEdge ? nodes.find(n => n.id === outgoingEdge.target) : null;
    };

    const processEmailNode = (emailNode, parentEmailId = null, accumulatedDelay = 0, branch = null) => {
      const uniqueId = uuidv4();
      const email = {
        id: uniqueId,
        subject: `Email ${uniqueId}`,
        content: emailNode.data.content || `Content for email ${uniqueId}...`,
        delay_hours: accumulatedDelay,
        parent_email_id: parentEmailId
      };

      if (branch) {
        email.branch = branch;
      }

      emails.push(email);

      const nextNode = getNextNode(emailNode.id);
      if (nextNode) {
        if (nextNode.type === 'delay') {
          const delayHours = parseInt(nextNode.data.delay) || 24;
          email.next_email_id = processNode(getNextNode(nextNode.id), email.id, accumulatedDelay + delayHours, branch);
        } else if (nextNode.type === 'condition') {
          email.condition = processConditionNode(nextNode, email.id, accumulatedDelay);
          // Remove next_email_id for emails with conditions
          delete email.next_email_id;
        } else {
          email.next_email_id = processNode(nextNode, email.id, accumulatedDelay, branch);
        }
      }

      return email.id;
    };

    const processConditionNode = (conditionNode, parentEmailId, accumulatedDelay) => {
      const trueEdge = edges.find(e => e.source === conditionNode.id && e.sourceHandle === 'yes');
      const falseEdge = edges.find(e => e.source === conditionNode.id && e.sourceHandle === 'no');

      const processBranch = (edge, branchType) => {
        if (!edge) return null;
        const nextNode = nodes.find(n => n.id === edge.target);
        if (nextNode) {
          return processNode(nextNode, parentEmailId, accumulatedDelay, branchType);
        }
        return null;
      };

      return {
        type: conditionNode.data.conditionType || "opened",
        true_branch: { email_id: processBranch(trueEdge, 'true') },
        false_branch: { email_id: processBranch(falseEdge, 'false') }
      };
    };

    const processNode = (node, parentEmailId = null, accumulatedDelay = 0, branch = null) => {
      if (!node) return null;

      switch (node.type) {
        case 'email':
          return processEmailNode(node, parentEmailId, accumulatedDelay, branch);
        case 'delay':
          {
            const delayHours = parseInt(node.data.delay) || 24;
            return processNode(getNextNode(node.id), parentEmailId, accumulatedDelay + delayHours, branch);
          }
        case 'condition':
          {
            const lastEmail = emails[emails.length - 1];
            lastEmail.condition = processConditionNode(node, lastEmail.id, accumulatedDelay);
            // Remove next_email_id for emails with conditions
            delete lastEmail.next_email_id;
            return lastEmail.id;
          }
        default:
          console.warn(`Unexpected node type: ${node.type}`);
          return null;
      }
    };

    // Start processing from the 'start' node
    const startNode = nodes.find(n => n.type === 'start');
    const firstNode = getNextNode(startNode.id);
    if (firstNode) {
      processNode(firstNode);
    } else {
      console.warn('No node connected to the start node');
    }

    const output = { emails };
    console.log(JSON.stringify(output, null, 2));

  }

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
    [setNodes]
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
    [setEdges]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          onInit={setRfInstance}
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
        <button onClick={() => onLayout()}>Layout</button>
        <button onClick={() => onPublish()}> Publish</button>
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
