import React from "react";
import { socket } from "./index";
import FleetGroup from "./fleetgroup";
import { FleetMember, FleetPlaceholder } from "./fleetmember";
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

@DragDropContext(HTML5Backend)
export default class FleetDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet: 'Getting fleet data...' };
    socket.on('fleet_update', (data) => {
      this.setState({ fleet: JSON.parse(data) });
    });
    socket.emit('register_fleet_handler');
  }

  render () {
    if ( this.state.fleet == "Getting fleet data..." ) {
      return <div>{this.state.fleet}</div>;
    }
    var fleet = [];
    var fleet_count = 0;
    if ('fleet_commander' in this.state.fleet) {
      fleet.push(<FleetMember key={this.state.fleet.fleet_commander.character_id} member={this.state.fleet.fleet_commander} style={{borderBottom:0, borderBottomRightRadius:0, borderBottomLeftRadius:0}} />);
      fleet_count += 1;
    }
    else {
      fleet.push(<FleetPlaceholder key={-1} role="Fleet Commander" />);
    }
    for (var i=0; i < this.state.fleet.wings.length; i++){
      var wing = this.state.fleet.wings[i];
      var squads = [];
      var wing_count = 0;
      if ('wing_commander' in wing) {
        squads.push(<FleetMember key={wing.wing_commander.character_id} member={wing.wing_commander} />);
        wing_count += 1;
      }
      else {
        squads.push(<FleetPlaceholder key={wing.id} wing_id={wing.id} role="Wing Commander" />);
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
          squad_members.push(<FleetPlaceholder key={squad.id} wing_id={wing.id} squad_id={squad.id} role="Squad Commander" />);
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            squad_members.push(<FleetMember key={squad.members[k].character_id} member={squad.members[k]} />);
            squad_count += 1;
          }
        }
        else {
          squad_members.push(<FleetPlaceholder key={squad.id * -1} member wing_id={wing.id} squad_id={squad.id} role="Squad Member" />);
        }
        squads.push(<FleetGroup key={squad.id} id={squad.id} wing_id={wing.id} squad_id={squad.id} name={squad.name} children={squad_members} count={squad_count} />);
        wing_count += squad_count;
      }
      fleet.push(<FleetGroup key={wing.id} id={wing.id} wing_id={wing.id} name={wing.name} children={squads} count={wing_count} />);
      fleet_count += wing_count;
    }
  return (
    <span>
      <div className="w-100 p-1 d-flex justify-content-between sticky-top border-bottom bg-light border-secondary">
        <div></div>
        <h5 className="m-0 text-truncate">Fleet Members</h5>
        <div className="my-auto mx-1 align-center float-right badge badge-secondary">{fleet_count}</div>
      </div>
      <div className="list-group p-2">
        {fleet}
      </div>
    </span>
    );
  }
}
