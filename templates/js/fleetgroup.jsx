import React from "react";
import { DropTarget } from 'react-dnd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { socket } from "./index";
import $ from 'jquery'; 

const squadTarget = {
	drop(props, monitor) {
        if (monitor.didDrop()){
            return
        }
        if (typeof props.squad_id === 'undefined') {
            return
        }
        var source = monitor.getItem();
        socket.emit('move', {name: source.name, id: source.id, role: 'squad_member', wing: props.wing_id, squad: props.squad_id});
	},
}

@DropTarget("member", squadTarget, 
	(connect, monitor) => ({
		connectDropTarget: connect.dropTarget(),
		isOver: monitor.isOver(),
		canDrop: false,
	}))
export default class FleetGroup extends React.Component {
  constructor(props) {
    super(props);
    this.state = { carret_direction: null }
    this.previousCount = props.count
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
    this.handleCollapse = this.handleCollapse.bind(this);
    this.onButtonDragOver = this.onButtonDragOver.bind(this);
    this.tooltip = React.createRef();
  }

  componentDidMount() {
    $(this.tooltip.current).tooltip();
  }

  onButtonDragOver(event) {
    if (this.show.startsWith("show") && this.show_state == ""){
        this.show += " ";
    }
    else {
        this.show = "show";
    }
    this.show_state = "show";
    this.setState({carret_direction: "down"});
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

  render() {
    const {
        isOver,
        connectDropTarget,
    } = this.props
    if ((this.previousCount == 0 && this.props.count > 0)) {
      this.state.carret_direction = "down";
      if (this.show.startsWith("show") && this.show_state == ""){
        this.show += " ";
      }
      else {
        this.show = "show";
      }
      this.show_state = "show";
    }
    this.previousCount = this.props.count;
    return ( connectDropTarget && connectDropTarget(
        <div className="list-group-item list-group-item-container pb-0" id={this.props.id} style={isOver && this.props.squad_id ? {backgroundColor: '#666'} : {}}>
            <div style={{height: "1.6rem", whiteSpace: "nowrap", overflow: "hidden"}}>
                <button className="btn btn-link p-0" data-toggle="collapse" onDragEnter={this.onButtonDragOver} data-target={"#collapse_" + this.props.id} onClick={this.handleCollapse}>
                    <FontAwesomeIcon className="mr-1" icon={"caret-" + this.state.carret_direction} />
                    {this.props.name}
                </button>
                
                <div className="m-1 float-right badge badge-secondary" ref={this.tooltip} data-toggle="tooltip" 
                      data-html="true" data-placement="bottom" data-original-title={this.props.details}>
                    {this.props.count}
                </div>
            </div>

            <div id={"collapse_" + this.props.id} className={"ml-3 pb-1 collapse " + this.show}>
                {this.props.children}
            </div>
        </div>
        )
    );
  }
}