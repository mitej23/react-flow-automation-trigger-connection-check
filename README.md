# Automation Flow Editor

This project is a prototype of an automation flow editor built using [React Flow](https://reactflow.dev/). The editor allows you to create automation flows, handle sub-flow connections, rearrange nodes automatically using the Dagre library, and implement drag-and-drop functionality for custom nodes and edges.

## Features

- **Sub-flow Connection**: Ensures that all sub-flows are connected to the starting trigger node.
- **Auto-layout with Dagre**: Automatically arranges nodes in a hierarchical layout using the Dagre library.
- **Drag and Drop**: Add new nodes to the flow by dragging and dropping them onto the canvas.
- **Custom Nodes and Edges**: Supports custom node types (e.g., `start`, `email`, `delay`, `condition`) and custom edges.
- **Color-coded Nodes**: Nodes connected to the start node are colored green, while disconnected nodes are colored red.
- **Connection Rules**: Enforces strict rules for connecting nodes (e.g., a "start" node can only connect to "delay" or "email" nodes).
- **Dynamic Layout Update**: Layout is dynamically updated upon adding, deleting, or connecting nodes and edges.
