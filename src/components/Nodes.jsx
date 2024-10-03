import { Handle, Position, useHandleConnections } from '@xyflow/react';
import '../App.css';

const handleStyle = {
  width: '7.5px',
  height: '7.5px',
  outline: '1px solid black',
};

const StartNode = ({ data }) => {
  return (
    <div
      className="start node"
      style={{
        // background: data.background || 'white',
        borderColor: data.background || 'black',
      }}
    >
      <div>{data.label}</div>
      <CustomHandle
        type="source"
        style={handleStyle}
        position={Position.Bottom}
      />
    </div>
  );
};

const DelayNode = ({ data }) => (
  <div
    className="delay node"
    style={{
      // background: data.background || 'white',
      borderColor: data.background || 'black',
    }}
  >
    <CustomHandle type="target" style={handleStyle} position={Position.Top} />
    <div>Delay</div>
    <select
      value={data.time}
      onChange={(e) => data.onChange('time', e.target.value)}
    >
      {[...Array(60)].map((_, i) => (
        <option key={i} value={i + 1}>
          {i + 1}
        </option>
      ))}
    </select>
    <select
      value={data.format}
      onChange={(e) => data.onChange('format', e.target.value)}
    >
      <option value="minutes">Minutes</option>
      <option value="hours">Hours</option>
      <option value="days">Days</option>
    </select>
    <CustomHandle
      style={handleStyle}
      type="source"
      position={Position.Bottom}
    />
  </div>
);

export const EmailNode = ({ data }) => (
  <div
    className="email node"
    style={{
      // background: data.background || 'white',
      borderColor: data.background || 'black',
    }}
  >
    <CustomHandle style={handleStyle} type="target" position={Position.Top} />
    <div>Email</div>
    <select
      value={data.email}
      onChange={(e) => data.onChange('email', e.target.value)}
    >
      <option value="email1">Email 1</option>
      <option value="email2">Email 2</option>
      <option value="email3">Email 3</option>
    </select>
    <CustomHandle
      style={handleStyle}
      type="source"
      position={Position.Bottom}
    />
  </div>
);

const diamondStyle = {
  width: 40,
  height: 40,
  transform: 'translate(-50%, -50%) rotate(45deg)',
  background: 'white',
  position: 'absolute',
  left: '50%',
  top: '50%',
  border: '1px solid #222',
  borderRadius: 2,
};

export const ConditionNode = ({ data }) => (
  <div
    className="condition"
    style={{
      // position: 'relative',
      // padding: '20px',
      width: '60px', // Adjust width and height as needed
      height: '60px',
      // Color similar to the one in the image (orange-ish)
      // transform: 'rotate(45deg)', // Rotate to make it a diamond
      // display: 'flex',
      // justifyContent: 'center',
      // alignItems: 'center',
      // borderRadius: '5px',
      // border: '1px solid #555', // Optional: add a border for clarity
    }}
  >
    <CustomHandle
      style={{ ...handleStyle, zIndex: 1 }}
      type="target"
      position={Position.Top}
      id="incoming"
      // Adjusting position for rotated node
    />
    <div
      style={{
        zIndex: 10,
        position: 'relative',
        fontSize: 12,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      Read?
    </div>{' '}
    <div
      style={{
        ...diamondStyle,
        // background: data.background || 'white',
        borderColor: data.background || 'black',
      }}
    />
    <CustomHandle
      style={{
        ...handleStyle,
        zIndex: 1,

        outline: '1px solid green',
        background: 'green',
      }}
      type="source"
      position={Position.Left}
      id="yes"
    />
    <CustomHandle
      style={{
        ...handleStyle,
        zIndex: 1,

        outline: '1px solid red',
        background: 'red',
      }}
      type="source"
      position={Position.Right}
      id="no"
    />
  </div>
);

// Node types object
export const nodeTypes = {
  start: StartNode,
  delay: DelayNode,
  email: EmailNode,
  condition: ConditionNode,
};

const CustomHandle = (props) => {
  const connections = useHandleConnections({
    type: props.type,
  });

  return <Handle {...props} isConnectable={connections.length < 1} />;
};
