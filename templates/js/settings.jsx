import React from "react";
import { SketchPicker } from 'react-color';
import { cardReferences } from "./pelddisplay";

export var secondsToAverage = 10;
export var colors = {
  'DPS In': '#FF0000',
  'Cap Damage In': '#FF7F50',
  'Logi In': '#32CD32',
  'Cap Received': '#ADFF2F',
  'DPS Out': '#00FFFF',
  'Cap Damage Out': '#FF8C00',
  'Logi Out': '#66CDAA',
  'Cap Transferred': '#FFFF00',
};

var defaultPickerColors = [
  '#FF0000', '#00FFFF', '#FF7F50', '#FF8C00',
  '#32CD32', '#66CDAA', '#ADFF2F', '#FFFF00',
  '#8B572A', '#417505', '#BD10E0', '#9013FE',
  '#4A90E2', '#D0021B', '#9B9B9B', '#FFFFFF'
]

export default class SettingsModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render () { 
    return (
      <div className="modal fade" id="settingsModal" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">PELD-Fleet Settings</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <h4 className="border-bottom border-secondary">General:</h4>
              Number of seconds to average damage values: <input type="number" min="1" max="1000" value={secondsToAverage} /><br />
              <i>Note: Recommended to make this longer than your fleet's weapon cycle time</i>
              <h4 className="border-bottom border-secondary mt-2">Colors:</h4>
              <ColorButton colorFor="DPS In" color="#FF0000" />
              <ColorButton colorFor="DPS Out" color="#00FFFF" />
              <ColorButton colorFor="Cap Damage In" color="#FF7F50" />
              <ColorButton colorFor="Cap Damage Out" color="#FF8C00" />
              <ColorButton colorFor="Logi In" color="#32CD32" />
              <ColorButton colorFor="Logi Out" color="#66CDAA" />
              <ColorButton colorFor="Cap Received" color="#ADFF2F" />
              <ColorButton colorFor="Cap Transferred" color="#FFFF00" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-dismiss="modal">Ok</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

class ColorButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      displayColorPicker: false,
      color: this.props.color,
    }
    this.handleClick = this.handleClick.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);
  }

  handleClick () {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  };

  handleClose () {
    this.setState({ displayColorPicker: false })
  };

  handleChangeComplete (color, event) {
    this.setState({ color: color.hex });
    colors[this.props.colorFor] = color.hex;
    cardReferences[this.props.colorFor].current.forceUpdate();
  };

  render() {
    const popover = {
      position: 'absolute',
      zIndex: '2000',
    }
    const cover = {
      position: 'fixed',
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    }
    const buttonSize = {
      width: '20px',
      height: '20px',
    }
    return (
      <div>
        {this.props.colorFor}:
        <button className="btn btn-link p-0 m-1" onClick={ this.handleClick } style={{backgroundColor: this.state.color}}>
          <div style={ buttonSize }></div>
        </button>
        { this.state.displayColorPicker ? <div className="d-inline-block" style={ popover }>
          <div style={ cover } onClick={ this.handleClose }/>
          <SketchPicker color={this.state.color} disableAlpha={true} presetColors={defaultPickerColors} onChangeComplete={ this.handleChangeComplete } />
        </div> : null }
      </div>
    )
  }
}