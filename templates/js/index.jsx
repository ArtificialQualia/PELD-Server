import 'bootstrap';
import React from "react";
import ReactDOM from "react-dom";
import FleetDisplay from "./fleetdisplay";
import FleetStats from "./fleetstats";
import PeldDisplay from "./pelddisplay";
import SettingsModal from "./settings";
import Alert from "./alert";
import io from 'socket.io-client';
import SplitPane from "react-split-pane/index.js";
import Pane from "react-split-pane/lib/Pane.js";
import { Scrollbars } from 'react-custom-scrollbars';

import { library } from '@fortawesome/fontawesome-svg-core';
import { faStar } from '@fortawesome/free-solid-svg-icons/faStar';
import { faTimes } from '@fortawesome/free-solid-svg-icons/faTimes';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons/faCaretDown';
import { faCaretRight } from '@fortawesome/free-solid-svg-icons/faCaretRight';
import { faCog } from '@fortawesome/free-solid-svg-icons/faCog';
library.add(faStar)
library.add(faTimes)
library.add(faCheck)
library.add(faCaretDown)
library.add(faCaretRight)
library.add(faCog)

export var socket = null;
export var peldDataRef = React.createRef();

if (window.location.pathname.split('/')[1] == 'app') {
  socket = io()
  socket.on('reconnect', (attemptNumber) => {
    socket.emit('register_fleet_handler');
  });

  const content = (
    <SplitPane split="vertical">
      <Pane initialSize="25%" maxSize="49%">
        <Scrollbars autoHide={true} autoHideDuration={500} renderThumbVertical={props => <div {...props} className="custom-scroll-vertical"/>} >
          <FleetDisplay />
        </Scrollbars>
      </Pane>
      <Pane>
        <Scrollbars autoHide={true} autoHideDuration={500} renderThumbVertical={props => <div {...props} className="custom-scroll-vertical"/>} >
          <PeldDisplay />
        </Scrollbars>
      </Pane>
      <Pane initialSize="20%" maxSize="49%">
        <Scrollbars autoHide={true} autoHideDuration={500} renderThumbVertical={props => <div {...props} className="custom-scroll-vertical"/>} >
          <FleetStats ref={peldDataRef} />
        </Scrollbars>
      </Pane>
    </SplitPane>
  );

  ReactDOM.render(<SettingsModal />, document.getElementById("settings"))
  ReactDOM.render(content, document.getElementById("content"));
  ReactDOM.render(<Alert />, document.getElementById("error"));
}
