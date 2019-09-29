import React from "react";
import { SketchPicker } from 'react-color';
import { cardReferences } from "./pelddisplay";
import { socket } from "./index";
import $ from 'jquery';

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
    return JSON.parse(storageValue);
  }
  return false;
})();
export var expandInvolved = (() => {
  var storageValue = localStorage.getItem('expandInvolved');
  if (storageValue) {
    return JSON.parse(storageValue);
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
    this.modal = React.createRef();
    this.state = {
      secondsToAverage: secondsToAverage,
      expandEntries: expandEntries,
      expandInvolved: expandInvolved,
      fleet_settings: {
        fleet_access: {
          fleet_commander: false,
          wing_commander: false,
          squad_commander: false,
          squad_member: false
        },
        boss: 0
      }
    }
    this.handleSecondsChange = this.handleSecondsChange.bind(this);
    this.handleExpandChange = this.handleExpandChange.bind(this);
    this.handleSiteAccessChange = this.handleSiteAccessChange.bind(this);
    socket.on('fleet_settings', (data) => {
      this.setState({fleet_settings: JSON.parse(data)});
      $(this.modal.current).modal('show');
    });
  }

  handleSecondsChange(event) {
    this.setState({secondsToAverage: event.target.value});
    secondsToAverage = event.target.value;
    localStorage.setItem('secondsToAverage', secondsToAverage);
  }

  handleExpandChange(event) {
    if (event.target.name == "expandEntries") {
      this.setState({expandEntries: event.target.checked});
      expandEntries = event.target.checked;
      localStorage.setItem('expandEntries', expandEntries);
    }
    else if (event.target.name == "expandInvolved") {
      this.setState({expandInvolved: event.target.checked});
      expandInvolved = event.target.checked;
      localStorage.setItem('expandInvolved', expandInvolved);
    }
  }

  handleSiteAccessChange(event) {
    var checked = event.target.checked;
    if (event.target.name == "access_fleet_commander") {
      this.setState((state) => {
        var new_state = state;
        new_state.fleet_settings.fleet_access.fleet_commander = checked;
        this.sendUpdatedSettings(new_state);
        return new_state;
      });
    }
    else if (event.target.name == "access_wing_commander") {
      this.setState((state) => {
        var new_state = state;
        new_state.fleet_settings.fleet_access.wing_commander = checked;
        this.sendUpdatedSettings(new_state);
        return new_state;
      });
    }
    else if (event.target.name == "access_squad_commander") {
      this.setState((state) => {
        var new_state = state;
        new_state.fleet_settings.fleet_access.squad_commander = checked;
        this.sendUpdatedSettings(new_state);
        return new_state;
      });
    }
    else if (event.target.name == "access_squad_member") {
      this.setState((state) => {
        var new_state = state;
        new_state.fleet_settings.fleet_access.squad_member = checked;
        this.sendUpdatedSettings(new_state);
        return new_state;
      });
    }
    
  }

  sendUpdatedSettings(state){
    socket.emit('fleet_settings', JSON.stringify({fleet_access: state.fleet_settings.fleet_access}));
  }

  render () { 
    var is_boss = this.state.fleet_settings.boss == $('#character_id').data('id');
    return (
      <div className="modal fade" ref={this.modal} id="settingsModal" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">PELD-Fleet Settings</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <h4 className="border-bottom border-secondary">PELD-Fleet Access:</h4>
              <i>You must be Fleet Boss to modify these</i>
              <br />
              <div className="d-flex w-100">
                <label className="w-50">
                  <input className="mr-1" type="checkbox" name="access_fleet_commander" disabled={(is_boss) ? "" : "disabled"}
                    checked={this.state.fleet_settings.fleet_access.fleet_commander} onChange={this.handleSiteAccessChange} style={{verticalAlign: '-2px'}} />
                  Fleet Commander
                </label>
                <label className="w-50">
                  <input className="mr-1" type="checkbox" name="access_wing_commander" disabled={(is_boss) ? "" : "disabled"}
                    checked={this.state.fleet_settings.fleet_access.wing_commander} onChange={this.handleSiteAccessChange} style={{verticalAlign: '-2px'}} />
                  Wing Commanders
                </label>
              </div>
              <div className="d-flex w-100">
                <label className="w-50">
                  <input className="mr-1" type="checkbox" name="access_squad_commander" disabled={(is_boss) ? "" : "disabled"}
                    checked={this.state.fleet_settings.fleet_access.squad_commander} onChange={this.handleSiteAccessChange} style={{verticalAlign: '-2px'}} />
                  Squad Commanders
                </label>
                <label className="w-50">
                  <input className="mr-1" type="checkbox" name="access_squad_member" disabled={(is_boss) ? "" : "disabled"}
                    checked={this.state.fleet_settings.fleet_access.squad_member} onChange={this.handleSiteAccessChange} style={{verticalAlign: '-2px'}} />
                  Squad Members
                </label>
              </div>
              <h4 className="border-bottom border-secondary mt-2">Data Display:</h4>
              Number of seconds to average damage values: <input type="number" min="1" max="999" value={secondsToAverage} onChange={this.handleSecondsChange} />
              <br />
              <i>Note: Make this longer than your fleet's weapon cycle time</i>
              <br />
              <label className="mt-1">
                <input className="mr-1" type="checkbox" name="expandInvolved" checked={this.state.expandInvolved} onChange={this.handleExpandChange} style={{verticalAlign: '-2px'}} />
                Expand PELD pilots involved by default
              </label>
              <br />
              <label>
                <input className="mr-1" type="checkbox" name="expandEntries" checked={this.state.expandEntries} onChange={this.handleExpandChange} style={{verticalAlign: '-2px'}} />
                Expand PELD weapon entries by default
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