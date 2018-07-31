import 'bootstrap';
import 'bootswatch/dist/darkly/bootstrap.min.css';
import '../css/peld.css';
import React from "react";
import ReactDOM from "react-dom";
import FleetDisplay from "./fleetmembers";
import io from 'socket.io-client';

var socket = io();

function handle_fleet_update(cb) {
  socket.on('fleet_update', (data) => {
    console.log(data);
    cb(data);
  });
};

function register_handler(type) {
  socket.emit(type)
}

export { handle_fleet_update };
export { register_handler };

ReactDOM.render(<FleetDisplay />, document.getElementById("content"));
