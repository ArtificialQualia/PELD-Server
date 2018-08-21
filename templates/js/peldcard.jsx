import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Draggable } from 'react-beautiful-dnd';
import { colors } from "./settings";

class InvolvedEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = { carret_direction: null }
    if (props.count > 0) {
      this.state.carret_direction = "down";
      this.show = "show";
      this.show_state = "show";
    }
    else {
      this.state.carret_direction = "right";
      this.show = "";
      this.show_state = "";
    }
    this.decoded_name = "";
    for (var i=0; i < this.props.name.length; i++) {
      this.decoded_name += "_" + this.props.name.charCodeAt(i);
    }
    this.handleCollapse = this.handleCollapse.bind(this);
  }

  handleCollapse(event) {
    if (event.currentTarget.classList.contains('collapsed')) {
      this.setState({carret_direction: "right"})
      this.show_state = "";
    }
    else {
      this.setState({carret_direction: "down"})
      this.show_state = "show";
    }
  }

  render () {
    var color = {color: colors[this.props.niceType]}
    return (
      <div className="list-group-item list-group-item-container pb-0">
        <div className="d-flex w-100 h-100 justify-content-between align-items-center peld-button-wrapper">
            <button className="btn btn-link pl-0 text-truncate d-flex align-items-center" data-toggle="collapse" 
              data-target={"#collapse_" + this.props.type + this.decoded_name} onClick={this.handleCollapse}>
              <FontAwesomeIcon className="mr-1" icon={"caret-" + this.state.carret_direction} />
              <div>
                <div className="text-left">
                  {this.props.name}
                </div>
                {this.props.entry.ship_name ? (
                  <div className="text-left">
                    { this.props.entry.ship_id > 0 ? 
                      <img className="mr-1" src={"https://image.eveonline.com/Render/" + this.props.entry.ship_id + "_32.png"} width="24" height="24" />
                    : ""}
                    {this.props.entry.ship_name}
                  </div>
                ): ""}
              </div>
            </button>
            <div className="m-1" style={color}>{this.props.entry.total}</div>
        </div>

        <div id={"collapse_" + this.props.type + this.decoded_name} className={"ml-3 pb-1 collapse " + this.show}>
          {this.props.entry.weapons.map((item, index) => (
            <div key={item[0]} className="list-group-item px-2">
              <div className="d-flex w-100 h-100 justify-content-between align-items-center">
                <div className="text-truncate">{item[0]}</div>
                <div style={color}>{item[1].total}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export class StatEntry extends React.Component {
  constructor(props) {
    super(props);
    this.state = { carret_direction: null }
    if (props.count > 0) {
      this.state.carret_direction = "down";
      this.show = "show";
      this.show_state = "show";
    }
    else {
      this.state.carret_direction = "right";
      this.show = "";
      this.show_state = "";
    }
    this.decoded_name = "";
    for (var i=0; i < this.props.name.length; i++) {
      this.decoded_name += "_" + this.props.name.charCodeAt(i);
    }
    this.handleCollapse = this.handleCollapse.bind(this);
  }

  handleCollapse(event) {
    if (event.currentTarget.classList.contains('collapsed')) {
      this.setState({carret_direction: "right"})
      this.show_state = "";
    }
    else {
      this.setState({carret_direction: "down"})
      this.show_state = "show";
    }
  }

  render () {
    var color = {color: colors[this.props.niceType]}
    return (
      <div className="list-group-item list-group-item-container pb-0">
        <div className="d-flex w-100 h-100 justify-content-between align-items-center peld-button-wrapper">
            <button className="btn btn-link pl-0 text-truncate d-flex align-items-center" data-toggle="collapse" 
              data-target={"#collapse_" + this.props.type + this.decoded_name} onClick={this.handleCollapse}>
                <FontAwesomeIcon className="mr-1" icon={"caret-" + this.state.carret_direction} />
                <div>
                  <div className="text-left">
                    {this.props.name}
                  </div>
                  {this.props.entry.ship_name ? (
                    <div className="text-left">
                      { this.props.entry.ship_id > 0 ? 
                        <img className="mr-1" src={"https://image.eveonline.com/Render/" + this.props.entry.ship_id + "_32.png"} width="24" height="24" />
                      : ""}
                      {this.props.entry.ship_name}
                    </div>
                  ): ""}
                </div>
            </button>
            <div className="m-1" style={color}>{this.props.entry.total}</div>
        </div>

        <div id={"collapse_" + this.props.type + this.decoded_name} className={"ml-3 pb-1 collapse " + this.show}>
          {this.props.entry.involved.map((item, index) => (
            <InvolvedEntry key={item[0]} type={this.props.type} niceType={this.props.niceType} name={item[0]} entry={item[1]} />
          ))}
        </div>
      </div>
    );
  }
}

export class PeldCard extends React.Component {
  constructor(props) {
    super(props);
  }

  render () {
    var color = {color: colors[this.props.type]}
    return (
      <Draggable draggableId={this.props.type} index={this.props.index}>
        {(provided, snapshot) => {

          const onMouseDown = (() => {
            if (!provided.dragHandleProps) {
              return onMouseDown;
            }

            return event => {
              if (event.target.className.includes("card-title") ||
                  event.target.parentElement.className.includes("card-title")) {
                provided.dragHandleProps.onMouseDown(event);
              }
            };
          })();

          return (
            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onMouseDown={onMouseDown} className="list-group-item-container py-1">
              <div className="text-center list-group-item card-title text-truncate" onMouseDown={this.props.onMouseDown}>
                <strong style={{color: colors[this.props.type]}}>{this.props.type}</strong>
              </div>
              <span style={{cursor: 'auto'}}>
                {this.props.children}
              </span>
            </div>
          )
        }}
      </Draggable>
    );
  }
}