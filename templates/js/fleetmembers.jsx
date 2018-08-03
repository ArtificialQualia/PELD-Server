import React from "react";
import { handle_fleet_update } from "./index";
import { register_handler } from "./index";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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

//const BossStar = (
//  <svg className="align-middle mr-1" height="16" width="16" viewBox="0 0 200 200">
//    <polygon points="100,10 40,198 190,78 10,78 160,198" className="star" />
//  </svg>
//);

function FleetMember(props) {
  var chevron = ""
  var star = ""
  if (props.member.role_name.startsWith('Fleet Commander')) {
    chevron = FCChevron;
  }
  else if (props.member.role_name.startsWith('Wing Commander')) {
    chevron = WCChevron;
  }
  else if (props.member.role_name.startsWith('Squad Commander')) {
    chevron = SCChevron;
  }
  if (props.member.role_name.endsWith('(Boss)')) {
    star = <FontAwesomeIcon className="star mr-1" icon="star" />;
  }
  return (
    <div className={"list-group-item list-group-item-action " + props.indent}>
      <span className="d-flex w-100 justify-content-between">
        <div className="text-truncate">
          {chevron}{star}
          <span className="">{props.member.character_name}</span>
        </div>
        <small className="text-nowrap align-top">PELD: <FontAwesomeIcon className="ml-1 red" icon="times" /></small>
      </span>
      <span className="align-middle d-flex w-100 justify-content-between">
        <div className="text-truncate">
          <img className="mr-1" src={"https://image.eveonline.com/Render/" + props.member.ship_type_id + "_32.png"} width="16" height="16" />
          <small>{props.member.ship_name}</small>
        </div>
        <div className="text-nowrap">
          <small className="align-middle">{props.member.location_name}</small>
        </div>
      </span>
    </div>
  );
}

class FleetGroup extends React.Component {
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
    this.collapsibleRef = React.createRef();
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
    if (this.previousCount == 0 && this.props.count > 0) {
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
    return (
      <div className="list-group-item list-group-item-container pb-0" id={this.props.id}>
        <div style={{height: "1.6rem", whiteSpace: "nowrap", overflow: "hidden"}}>
          <button className="btn btn-link p-0" data-toggle="collapse" data-target={"#collapse_" + this.props.id} onClick={this.handleCollapse}>
            <FontAwesomeIcon className="mr-1" icon={"caret-" + this.state.carret_direction} />
            {this.props.name}
          </button>
          <div className="m-1 float-right badge badge-secondary">{this.props.count}</div>
        </div>

        <div id={"collapse_" + this.props.id} className={"ml-3 pb-1 collapse " + this.show}>
          {this.props.children}
        </div>
      </div>
    );
  }
}

export default class FleetDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet: 'Getting fleet data...' };
    handle_fleet_update((data) => {
      this.setState({ fleet: JSON.parse(data) });
    });
    register_handler('register_fleet_handler');
  }

  render () {
    if ( this.state.fleet == "Getting fleet data..." ) {
      return <div>{this.state.fleet}</div>;
    }
    var fleet = [];
    if ('fleet_commander' in this.state.fleet) {
      fleet.push(<FleetMember key={this.state.fleet.fleet_commander.character_id} member={this.state.fleet.fleet_commander} />);
    }
    else {
      fleet.push(<div key="-1" className="list-group-item text-truncate">{FCChevron}(No FC)</div>);
    }
    for (var i=0; i < this.state.fleet.wings.length; i++){
      var wing = this.state.fleet.wings[i];
      var squads = []
      var wing_count = 0;
      if ('wing_commander' in wing) {
        squads.push(<FleetMember key={wing.wing_commander.character_id} member={wing.wing_commander} />);
        wing_count += 1;
      }
      else {
        squads.push(<div key={wing.id} className="list-group-item text-truncate">{WCChevron}(No Wing Commander)</div>);
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        var squad_members = [];
        var squad_count = 0;
        if ('squad_commander' in squad) {
          squad_members.push(<FleetMember key={squad.squad_commander.character_id} member={squad.squad_commander} />);
          squad_count += 1;
        }
        else {
          squad_members.push(<div key={squad.id} className="list-group-item text-truncate">{SCChevron}(No Squad Commander)</div>);
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            squad_members.push(<FleetMember key={squad.members[k].character_id} member={squad.members[k]} />);
            squad_count += 1;
          }
        }
        else {
          squad_members.push(<div key={squad.id * -1} className="list-group-item text-truncate">(No Members)</div>);
        }
        squads.push(<FleetGroup key={squad.id} id={squad.id} name={squad.name} children={squad_members} count={squad_count} />);
        wing_count += squad_count;
      }
      fleet.push(<FleetGroup key={wing.id} id={wing.id} name={wing.name} children={squads} count={wing_count} />);
    }
//    var fleet_elements = this.state.fleet.map((fleet_member) =>
//      <div className="list-group-item">{fleet_member}</div>
//    );
    return <div className="list-group p-1 pr-2">{fleet}</div>;
  }
}

