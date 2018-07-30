import React from "react";
import { handle_fleet_members_event } from "./index";
import { register_handler } from "./index";

class FleetMember extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet_member: 'Getting fleet data...' };
    console.log(props);
  }
  render () {
    return <div>{this.props.character_id}</div>;
  }
}

export default class FleetMembers extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet_members: 'Getting fleet data...' };
    handle_fleet_members_event((data) => {
      this.setState({ fleet_members: JSON.parse(data) });
    });
    register_handler('register_fleet_handler');
  }
  render () {
    if ( this.state.fleet_members == "Getting fleet data..." ) {
      return <div>{this.state.fleet_members}</div>;
    }
    var fleet_elements = this.state.fleet_members.map((fleet_member) =>
      <li className="list-group-item">{fleet_member['character_id']}</li>
    );
    return <ul className="list-group">{fleet_elements}</ul>;
  }
}

