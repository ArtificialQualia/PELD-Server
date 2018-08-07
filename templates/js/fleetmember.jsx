import React from "react";
import { DragSource, DropTarget } from 'react-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { socket } from "./index";

const FCChevron = (
  <svg className="svg-inline--fa mr-1" height="16" width="16" viewBox="0 0 32 32">
    <polyline points="2,11 16,3 30,11" className="chevron"></polyline>
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    <polyline points="2,29 16,21 30,29" className="chevron"></polyline>
    ?
  </svg>
);

const WCChevron = (
  <svg className="svg-inline--fa mr-1" height="16" width="16" viewBox="0 0 32 24">
    <polyline points="2,11 16,3 30,11" className="chevron"></polyline>
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    ?
  </svg>
);

const SCChevron = (
  <svg className="svg-inline--fa mr-1" height="16" width="16" viewBox="0 0 32 32">
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    ?
  </svg>
);

const memberSource = {
	beginDrag(props) {
		return {
			id: props.member.character_id,
			name: props.member.character_name,
		}
	},
}

@DragSource("member", memberSource, 
	(connect, monitor) => ({
		connectDragSource: connect.dragSource(),
		isDragging: monitor.isDragging(),
    }))
export class FleetMember extends React.Component {
  constructor(props) {
    super(props);
    this.state = {draggable: true};
    this.setDraggable = this.setDraggable.bind(this)
    this.unsetDraggable = this.unsetDraggable.bind(this)
  }

  setDraggable() {
      this.setState({draggable: true})
  }

  unsetDraggable() {
      this.setState({draggable: false})
  }

  kick(_id, event) {
    socket.emit('kick', _id)
  }

  render() {
    var chevron = ""
    var star = ""
    if (this.props.member.role_name.startsWith('Fleet Commander')) {
      chevron = FCChevron;
    }
    else if (this.props.member.role_name.startsWith('Wing Commander')) {
      chevron = WCChevron;
    }
    else if (this.props.member.role_name.startsWith('Squad Commander')) {
      chevron = SCChevron;
    }
    if (this.props.member.role_name.endsWith('(Boss)')) {
      star = <FontAwesomeIcon className="star mr-1" icon="star" />;
    }
    const {
        accepts,
        isOver,
        canDrop,
        connectDropTarget,
        lastDroppedItem,
    } = this.props
    const { isDropped, isDragging, connectDragSource } = this.props
    var element = (
        <div className={"dropdown list-group-item list-group-item-action fleet-member " + this.props.indent} style={isOver ? Object.assign({}, this.props.style, {backgroundColor: '#666'}) : this.props.style}>
            <div data-toggle="dropdown">
            <span className="d-flex w-100 justify-content-between">
                <div className="text-truncate">
                {chevron}{star}
                <span className="selectable-text" onMouseEnter={this.unsetDraggable} onMouseLeave={this.setDraggable}>{this.props.member.character_name}</span>
                </div>
                <small className="text-nowrap align-top">PELD: <FontAwesomeIcon className="ml-1 red" icon="times" /></small>
            </span>
            <span className="align-middle d-flex w-100 justify-content-between">
                <div className="text-truncate">
                <img className="mr-1" src={"https://image.eveonline.com/Render/" + this.props.member.ship_type_id + "_32.png"} width="16" height="16" />
                <small className="selectable-text" onMouseEnter={this.unsetDraggable} onMouseLeave={this.setDraggable}>{this.props.member.ship_name}</small>
                </div>
                <div className="text-nowrap">
                <small className="align-middle selectable-text" onMouseEnter={this.unsetDraggable} onMouseLeave={this.setDraggable}>{this.props.member.location_name}</small>
                </div>
            </span>
            </div>
            <div className="dropdown-menu dropdown-menu-right">
            <button className="dropdown-item text-danger" type="button" onClick={this.kick.bind(this, this.props.member.character_id)}>Kick from fleet</button>
            </div>
        </div>
      )
    if (this.state.draggable) {
        return (
        connectDragSource &&
        connectDragSource(element)
        );
    }
    else {
        return element;
    }
  }
}

const memberTarget = {
	drop(props, monitor) {
        var role = "fleet_commander"
        var dest_wing_id = -1;
        if (typeof props.wing_id != 'undefined') {
            dest_wing_id = props.wing_id;
            role = "wing_commander"
        }
        var dest_squad_id = -1;
        if (typeof props.squad_id != 'undefined') {
            dest_squad_id = props.squad_id;
            role = "squad_commander"
        }
        if (props.member){
            role = "squad_member"
        }
        var source = monitor.getItem();
        socket.emit('move', {name: source.name, id: source.id, role: role, wing: dest_wing_id, squad: dest_squad_id});
	},
}

@DropTarget("member", memberTarget, 
	(connect, monitor) => ({
		connectDropTarget: connect.dropTarget(),
		isOver: monitor.isOver(),
		canDrop: monitor.canDrop(),
    }))
export class FleetPlaceholder extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {
        accepts,
        isOver,
        canDrop,
        connectDropTarget,
        lastDroppedItem,
    } = this.props
    var chevron = ""
    if (this.props.role.startsWith('Fleet Commander')) {
      chevron = FCChevron;
    }
    else if (this.props.role.startsWith('Wing Commander')) {
      chevron = WCChevron;
    }
    else if (this.props.role.startsWith('Squad Commander')) {
      chevron = SCChevron;
    }
    return (
      connectDropTarget && connectDropTarget(
        <div className={"dropdown list-group-item list-group-item-action fleet-placeholder"} style={isOver ? {backgroundColor: '#666'} : {}}>
            <span className="d-flex w-100 justify-content-between">
                <div className="text-truncate">
                {chevron}
                <span className="selectable-text">{"(No "+this.props.role+")"}</span>
                </div>
            </span>
        </div>
      )
    );
  }
}
