import React from "react";
import { socket } from "./index";

export default class PeldDisplay extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet: 'Getting fleet data...' };
    socket.on('peld_data', (data) => {
      this.setState({ fleet: JSON.parse(data) });
    });
  }

  render () {
    return (
      <div className="d-flex w-100 justify-content-between p-1">
        <div className="w-100">
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>DPS In</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Cap Damage In</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Logi In</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Cap Transfer In</strong>
            </div>
          </div>
        </div>
        <div className="w-100">
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>DPS Out</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Cap Damage Out</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Logi Out</strong>
            </div>
          </div>
          <div className="list-group-item-container py-1">
            <div className="text-center list-group-item">
              <strong>Cap Transfer Out</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
