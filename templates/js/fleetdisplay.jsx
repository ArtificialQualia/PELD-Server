import React from "react";
import { socket } from "./index";
import FleetGroup from "./fleetgroup";
import { FleetMember, FleetPlaceholder } from "./fleetmember";
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import $ from 'jquery'; 

export var character_ship_data = {}

@DragDropContext(HTML5Backend)
export default class FleetDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.tooltip = React.createRef();
    this.state = { fleet: 'Getting fleet data...' };
    socket.on('fleet_update', (data) => {
      this.setState({ fleet: JSON.parse(data) });
    });
    socket.emit('register_fleet_handler');
  }

  componentDidMount() {
    $(this.tooltip.current).tooltip();
  }

  componentDidUpdate() {
    $(this.tooltip.current).tooltip();
  }

  addToData(member) {
    character_ship_data[member.character_name] = {
      ship_name: member.ship_name,
      ship_id: member.ship_type_id
    }
    if (member.role_name.startsWith('Fleet Commander')) {
      this.fleet_detail += "<br />"+member['character_name']
      this.fleet_count += 1;
    }
    else if (member.role_name.startsWith('Wing Commander')) {
      this.wing_detail += "<br />"+member['character_name']
      this.wing_count += 1;
    }
    else {
      this.squad_detail += "<br />"+member['character_name']
      this.squad_count += 1;
    }
  }

  render () {
    if ( this.state.fleet == "Getting fleet data..." ) {
      return <div>{this.state.fleet}</div>;
    }
    var fleet = [];
    this.fleet_count = 0;
    this.fleet_detail = "";
    if ('fleet_commander' in this.state.fleet) {
      fleet.push(<FleetMember key={this.state.fleet.fleet_commander.character_id} member={this.state.fleet.fleet_commander}
        style={{borderBottom:0, borderBottomRightRadius:0, borderBottomLeftRadius:0}} />);
      this.addToData(this.state.fleet.fleet_commander);
    }
    else {
      fleet.push(<FleetPlaceholder key={-1} role="Fleet Commander" />);
    }
    for (var i=0; i < this.state.fleet.wings.length; i++){
      var wing = this.state.fleet.wings[i];
      var squads = [];
      this.wing_count = 0;
      this.wing_detail = "";
      if ('wing_commander' in wing) {
        squads.push(<FleetMember key={wing.wing_commander.character_id} member={wing.wing_commander} />);
        this.addToData(wing.wing_commander);
      }
      else {
        squads.push(<FleetPlaceholder key={wing.id} wing_id={wing.id} role="Wing Commander" />);
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        var squad_members = [];
        this.squad_count = 0;
        this.squad_detail = "";
        if ('squad_commander' in squad) {
          squad_members.push(<FleetMember key={squad.squad_commander.character_id} member={squad.squad_commander} />);
          this.addToData(squad.squad_commander);
        }
        else {
          squad_members.push(<FleetPlaceholder key={squad.id} wing_id={wing.id} squad_id={squad.id} role="Squad Commander" />);
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            squad_members.push(<FleetMember key={squad.members[k].character_id} member={squad.members[k]} />);
            this.addToData(squad.members[k]);
          }
        }
        else {
          squad_members.push(<FleetPlaceholder key={squad.id * -1} member wing_id={wing.id} squad_id={squad.id} role="Squad Member" />);
        }
        squads.push(<FleetGroup key={squad.id} id={squad.id} wing_id={wing.id} squad_id={squad.id} name={squad.name} 
          children={squad_members} count={this.squad_count} details={this.squad_detail.replace("<br />", "")} />);
        this.wing_count += this.squad_count;
        this.wing_detail += this.squad_detail;
      }
      fleet.push(<FleetGroup key={wing.id} id={wing.id} wing_id={wing.id} name={wing.name} children={squads}
        count={this.wing_count} details={this.wing_detail.replace("<br />", "")} />);
      this.fleet_count += this.wing_count;
      this.fleet_detail += this.wing_detail;
    }
  return (
    <span>
      <div className="w-100 p-1 d-flex justify-content-between sticky-top border-bottom bg-light border-secondary">
        <div></div>
        <h5 className="m-0 text-truncate">Fleet Members</h5>
        <div className="my-auto mx-1 align-center float-right badge badge-secondary" ref={this.tooltip} data-toggle="tooltip" 
              data-html="true" data-placement="bottom" data-original-title={this.fleet_detail.replace("<br />", "")}>
            {this.fleet_count}
        </div>
      </div>
      <div className="list-group p-2">
        {fleet}
      </div>
    </span>
    );
  }
}
