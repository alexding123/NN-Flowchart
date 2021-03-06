import React from 'react';
import ReactDOM from 'react-dom';
import "./Canvas.css";
import {nodeTypes} from "./ModelInfo.js";
import {Group} from "./Group.js";
import {MarkerDefs, Line} from "./Line.js";
import {DELETE_KEY} from "./Constants.js";


function modelCenter(model) {
  /* get coordinates for the point on a model to connect to
   */
  const offsetX = nodeTypes[model.type].offsetX
  const offsetY = nodeTypes[model.type].offsetY
  return {x: model.x+offsetX, y: model.y+offsetY}
}

class Canvas extends React.Component {
  /* the class implementing the actual svg and all the event
   * listerers (along with its downstream elements)
   * stores the mouse locations and such information to implement
   * drag and drop
   */
  constructor(props) {
    super(props);
    this.props = props;
    
    this.state = {
      isNewline: false, // is there a new line being constructed?
      xOffset: 0, // offset of the svg's x from clientX
      yOffset: 0, // ibid for y
      x: 0, // x of the mouse relative to the svg
      y: 0, // ibid for y
      id: -1, // id of the line from which the current new line stems from
      selectedLineFromTo: [-1,-1], // selected line from node X to node Y ([X,Y])
      dragging: -1, // -1 means no dragging
      initX: 0,
      initY: 0,
      initModelX: 0,
      initModelY: 0,
    }

    // some function bindings
    this.handleElementClick = this.handleElementClick.bind(this);
    this.trackMouse = this.trackMouse.bind(this);
    this.handleBGClick = this.handleBGClick.bind(this);
    this.handleLineClick = this.handleLineClick.bind(this);
    this.deleteSelection = this.deleteSelection.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
  }

  componentDidMount() {
    // finds out the offsets of the svg
    const dim = ReactDOM.findDOMNode(this).getBoundingClientRect();
    this.setState({
      xOffset: dim.x,
      yOffset: dim.y,
    });

    // setup key listener for deletion
    document.addEventListener("keydown", this.deleteSelection);
  }

  componentWillUnmount() {
    // reset
    document.removeEventListener("keydown", this.deleteSelection);
  }

  deleteSelection(e) {
    /* delete the selected model */
    // ignore delete if editing a parameter
    if (this.props.editableSelected) {
      return;
    }
    if (e.keyCode === DELETE_KEY) {
      // prioritize items over line
      // if an item is selected
      if (this.props.selected !== -1) {
        // first cancel a few things just in case (to prevent errors)
        this.cancelNewline();
        const selected = this.props.selected;
        
        // cannot delete input or output node
        if (selected === 0 || selected === 1) {
          return;
        }
        this.props.select(-1);

        this.props.remove(selected);
        return;
      }

      // delete selected line
      const from = this.state.selectedLineFromTo[0];
      const to = this.state.selectedLineFromTo[1];
      if (from !== -1 || to !== -1) {
        this.cancelNewline();
        this.props.update(from, {
          connectedTo: null,
        });
        return;
      }
    }
  }

  startNewline(id) {
    /* starts the construction of a tentative new line */

    this.setState( {
      isNewline: true,
      id: id,
      selectedLineFromTo: [-1, -1], // reset line selection
    });
  }

  cancelNewline() {
    /* cancels the tentative new line */
    this.setState({
      isNewline: false,
      id: -1,
      selectedLineFromTo: [-1, -1], // reset line selection
    })
  }

  trackMouse(e) {
    /* a helper function to keep tracking mouse movement */
    this.setState({
      x: e.clientX - this.state.xOffset,
      y: e.clientY - this.state.yOffset,
    });

    if (this.state.dragging !== -1) {
      const newX = e.clientX + this.state.initModelX - this.state.initX;
      const newY = e.clientY + this.state.initModelY - this.state.initY;
      this.props.update(this.state.dragging, {
        x: newX,
        y: newY,
      });
    }
  }

  onMouseUp(e) {
    /* when the click is released, stop the drag-n-drop
     * and decide if it's an actual click
     */
    
    if (this.state.dragging === -1) {
      return;
    }
    const dragging = this.state.dragging;
    const dragged = this.props.models[dragging];

    // reset drag
    this.setState({
      dragging: -1,
    });
    
    const threshold = 10;
    // if movement is small enough, consider it a click
    if (Math.abs(dragged.x - this.state.initModelX) + Math.abs(dragged.y - this.state.initModelY) < threshold) {
      this.props.select(dragged.ID);
      this.handleElementClick(dragged.ID);
    }
  }

  handleBGClick(e) {
    /* handles a click on the background */
    if (e.target === this.refs.canvas) {
      this.props.select(-1); // deselect elements
      this.cancelNewline();
      return;
    }
    // the rest is handled on handleElementClick
  }

  handleElementClick(id) {
    /* handles a click to one of the elemnts, to be passed
     * to the child classes of the canvas
     */
    // if this is a new line, clicked on another object
    if (this.state.isNewline) {

      // if the line is drawn to itself, ignore
      if (this.state.id !== id) {
        // update model so that new connection is made
        this.props.update(this.state.id, {
          connectedTo: id,
        });
        
        // if the reverse connection exists, cancel it
        if (this.props.models[id].connectedTo === this.state.id) {
          this.props.update(id, {
            connectedTo: null,
          })
        }
      }
      // remove temporary line
      this.cancelNewline();
      return;
    }
    // if no current line, start one
    this.startNewline(id);
  }

  handleLineClick(idFrom, idTo) {
    /* handles a click on the line, to be passed
     * to the child class
     */
    this.setState({
      selectedLineFromTo: [idFrom, idTo]
    })
    this.props.select(-1);
  }

  handleDrag(initX, initY, id) {
    /* handle a new dragging session */
    const model = this.props.models[id];
    this.setState({
      dragging: id,
      initX: initX,
      initY: initY,
      initModelX: model.x,
      initModelY: model.y
    });
    this.props.select(model.ID);
  }

  render() {
    // let's do all the layers from the model first
    const modelElements = Object.entries(this.props.models).map(([key, model]) => {

    
      return <Group key={model.ID} handleDrag={this.handleDrag} model={model} selected={this.props.selected===model.ID}/>;
    });
    
    // this part handles rendering the tentative line (if any)
    let tentativeLine = null;
    if (this.state.isNewline) {
      const coords = modelCenter(this.props.models[this.state.id]);
      tentativeLine = <Line tentative={true} selected={true} x1={coords.x} y1={coords.y} x2={this.state.x} y2={this.state.y}/>
    }

    // renders all the lines between models
    const lines = Object.entries(this.props.models).map(([index, model]) => {
      // no line if there is no connection
      if (model.connectedTo === null) {
        return null;
      }
      const otherModel = this.props.models[model.connectedTo];
      const coords = modelCenter(model);
      const otherCoords = modelCenter(otherModel);
      const selected = this.state.selectedLineFromTo[0]===model.ID && this.state.selectedLineFromTo[1] === otherModel.ID;

      return <Line key={index} tentative={false} selected={selected} x1={coords.x} y1={coords.y} x2={otherCoords.x} y2={otherCoords.y} onClick={() => this.handleLineClick(model.ID, otherModel.ID)}></Line>
    })

    
    return (
      // stick a rect for background
      <svg onClick={this.handleBGClick} onMouseMove={this.trackMouse} onMouseUp={this.onMouseUp} id="canvas" width="100%" height="60%" ref="canvas">
        <MarkerDefs/>
        <rect width="100%" height="100%" fill="#b477ec" pointerEvents="none"/>
        {modelElements}
        {lines}
        {tentativeLine}
      </svg>
    )
  }
  
}

function Padding(props) {
  /* just padding to make the main canvas look better */
  return (
    <svg width="100%" height="20%">
      <rect width="100%" height="100%" fill="blueviolet"/>
    </svg>
  )
}

export function CanvasContainer(props) {
  /* contains the main section of the page yay */
  return (
    // padding on top and below to look extra good
    <div className="p-2 flex-grow-1 canvas-container no-margin"> 
      <Padding/>
      <Canvas models={props.models} editableSelected={props.editableSelected} selected={props.selected} select={props.select} update={props.update} remove={props.remove}/>
      <Padding/>
    </div>
  );
}