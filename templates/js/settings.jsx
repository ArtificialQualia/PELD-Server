import React from "react";
import { SketchPicker } from 'react-color';
import { cardReferences } from "./pelddisplay";

export var secondsToAverage = (() => {
  var storageValue = localStorage.getItem('secondsToAverage');
  if (storageValue) {
    return storageValue;
  }
  return 30;
})();
export var expandEntries = (() => {
  var storageValue = localStorage.getItem('expandEntries');
  if (storageValue) {
    return storageValue;
  }
  return false;
})();
export var colors = (() => {
  var storageValue = localStorage.getItem('colors');
  if (storageValue) {
    return JSON.parse(storageValue);
  }
  return {
    'DPS In': '#FF0000',
    'Cap Damage In': '#FF7F50',
    'Logi In': '#32CD32',
    'Cap Received': '#ADFF2F',
    'DPS Out': '#00FFFF',
    'Cap Damage Out': '#FF8C00',
    'Logi Out': '#66CDAA',
    'Cap Transferred': '#FFFF00',
  };
})();

var defaultPickerColors = [
  '#FF0000', '#00FFFF', '#FF7F50', '#FF8C00',
  '#32CD32', '#66CDAA', '#ADFF2F', '#FFFF00',
  '#8B572A', '#417505', '#BD10E0', '#9013FE',
  '#4A90E2', '#D0021B', '#9B9B9B', '#FFFFFF'
]

export default class SettingsModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      secondsToAverage: secondsToAverage,
      expandEntries: expandEntries}
    this.handleSecondsChange = this.handleSecondsChange.bind(this);
    this.handleExpandChange = this.handleExpandChange.bind(this);
  }

  handleSecondsChange(event) {
    this.setState({secondsToAverage: event.target.value});
    secondsToAverage = event.target.value;
    localStorage.setItem('secondsToAverage', secondsToAverage);
  }

  handleExpandChange(event) {
    this.setState({expandEntries: event.target.checked});
    expandEntries = event.target.checked;
    localStorage.setItem('expandEntries', expandEntries);
  }

  render () { 
    return (
      <div className="modal fade" id="settingsModal" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">PELD-Fleet Settings</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <h4 className="border-bottom border-secondary">General:</h4>
              Number of seconds to average damage values: <input type="number" min="1" max="999" value={secondsToAverage} onChange={this.handleSecondsChange} />
              <br />
              <i>Note: Make this longer than your fleet's weapon cycle time</i>
              <br />
              <br />
              <label>
                <input className="mr-1" type="checkbox" name="expandEntries" checked={this.state.expandEntries} onChange={this.handleExpandChange} />
                Expand PELD data entries by default
              </label>
              <h4 className="border-bottom border-secondary mt-2">Colors:</h4>
              <div className="d-flex w-100 justify-content-around">
                <ColorButton colorFor="DPS In" color={colors['DPS In']} />
                <ColorButton colorFor="DPS Out" color={colors['DPS Out']} />
              </div>
              <div className="d-flex w-100 justify-content-around">
                <ColorButton colorFor="Cap Damage In" color={colors['Cap Damage In']} />
                <ColorButton colorFor="Cap Damage Out" color={colors['Cap Damage Out']} />
              </div>
              <div className="d-flex w-100 justify-content-around">
                <ColorButton colorFor="Logi In" color={colors['Logi In']} />
                <ColorButton colorFor="Logi Out" color={colors['Logi Out']} />
              </div>
              <div className="d-flex w-100 justify-content-around">
                <ColorButton colorFor="Cap Received" color={colors['Cap Received']} />
                <ColorButton colorFor="Cap Transferred" color={colors['Cap Transferred']} />
              </div>
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
    localStorage.setItem('colors', JSON.stringify(colors));
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