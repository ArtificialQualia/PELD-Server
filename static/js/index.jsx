import 'bootstrap';
import 'bootswatch/dist/darkly/bootstrap.min.css';
import React from "react";
import ReactDOM from "react-dom";
import App from "./app";
import io from 'socket.io-client';

var socket = io();

function handle_fleet_members_event(cb) {
  socket.on('fleet_members', (data) => {
    console.log(data);
    cb(data);
  });
};

function register_handler(type) {
  socket.emit(type, true)
}

export { handle_fleet_members_event };
export { register_handler };

ReactDOM.render(<App />, document.getElementById("content"));
