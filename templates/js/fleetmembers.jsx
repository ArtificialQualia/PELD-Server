import React from "react";
import { handle_fleet_update } from "./index";
import { register_handler } from "./index";

const FCChevron = (
  <svg className="align-middle mr-1" height="16" width="16" viewBox="0 0 32 32">
    <polyline points="2,11 16,3 30,11" className="chevron"></polyline>
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    <polyline points="2,29 16,21 30,29" className="chevron"></polyline>
    ?
  </svg>
);

const WCChevron = (
  <svg className="align-middle mr-1" height="16" width="16" viewBox="0 0 32 32">
    <polyline points="2,11 16,3 30,11" className="chevron"></polyline>
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    ?
  </svg>
);

const SCChevron = (
  <svg className="align-middle mr-1" height="16" width="16" viewBox="0 0 32 32">
    <polyline points="2,20 16,12 30,20" className="chevron"></polyline>
    ?
  </svg>
);

function FleetMember(props) {
  var chevron = ""
  if (props.member.role_name.startsWith('Fleet Commander')) {
    chevron = FCChevron
  }
  else if (props.member.role_name.startsWith('Wing Commander')) {
    chevron = WCChevron
  }
  else if (props.member.role_name.startsWith('Squad Commander')) {
    chevron = SCChevron
  }
  return (
    <div className={"list-group-item list-group-item-action " + props.indent}>
      <span className="align-middle d-flex w-100 justify-content-between">
        <div className="text-truncate">{chevron}{props.member.character_name}</div>
        <small>PELD: </small>
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
      if ('wing_commander' in wing) {
        fleet.push(<FleetMember indent="ml-4" key={wing.wing_commander.character_id} member={wing.wing_commander} />);
      }
      else {
        fleet.push(<div key={wing.id} className="list-group-item text-truncate ml-4">{WCChevron}(No Wing Commander)</div>);
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        if ('squad_commander' in squad) {
          fleet.push(<FleetMember indent="ml-5" key={squad.squad_commander.character_id} member={squad.squad_commander} />);
        }
        else {
          fleet.push(<div key={squad.id} className="list-group-item text-truncate ml-5">{SCChevron}(No Squad Commander)</div>);
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            fleet.push(<FleetMember indent="ml-5" key={squad.members[k].character_id} member={squad.members[k]} />);
          }
        }
        else {
          fleet.push(<div key={squad.id * -1} className="list-group-item text-truncate ml-5">(No Members)</div>);
        }
      }
    }
//    var fleet_elements = this.state.fleet.map((fleet_member) =>
//      <div className="list-group-item">{fleet_member}</div>
//    );
    return <div className="list-group w-25">{fleet}</div>;
  }
}

