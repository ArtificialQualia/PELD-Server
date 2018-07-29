import React from "react";
import { handle_fleet_members_event } from "./index";
import { register_handler } from "./index";

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = { fleet_members: 'No fleet detected' };
    handle_fleet_members_event((data) => {
      this.setState({ fleet_members: data });
    });
    register_handler('register_fleet_handler');
  }
  render () {
    return <div>{this.state.fleet_members}</div>;
  }
}

