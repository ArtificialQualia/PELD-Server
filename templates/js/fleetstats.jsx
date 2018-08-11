import React from "react";
import ReactDOM from 'react-dom';
import { socket } from "./index";
import $ from 'jquery'; 

import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

class StatBadge extends React.Component {
    constructor(props){
        super(props);
        this.tooltip = React.createRef();
    }

    componentDidMount() {
        $(this.tooltip.current).tooltip();
    }

    render() {
        if (typeof this.props.details === 'undefined') {
        return (
            <div className="my-auto align-center badge badge-secondary ml-1" style={{fontSize: "85%"}}>
                {this.props.number}
            </div>
        );
        }
        else {
            return (
            <div className="my-auto align-center badge badge-secondary ml-1" style={{fontSize: "85%"}} 
            ref={this.tooltip} data-toggle="tooltip" data-html="true" data-placement="bottom" data-original-title={this.props.details}>
                {this.props.number}
            </div>
            );
        }
    }
}

class StatCard extends React.Component {
  constructor(props) {
      super(props);
  }

  render() {
    var title = ""
    if ( this.props.title ) {
    title = <div className="card-header bg-light p-2"><span className="title-text">{this.props.title}{this.props.number && <StatBadge number={this.props.number} details={this.props.details} />}</span></div>
    }
    var body = ""
    if ( this.props.body ) {
    body = (
        <div className="card-body bg-light p-2">
        <div className="card-text">
          {this.props.body}
        </div>
        </div>
    );
    }
    return (
        <Draggable draggableId={this.props.title} index={this.props.index}>
            {(provided, snapshot) => {

            const onMouseDown = (() => {
                if (!provided.dragHandleProps) {
                    return onMouseDown;
                }

                return event => {
                    if (["body-text","title-text"].indexOf(event.target.className) < 0 &&
                        ["body-text","title-text"].indexOf(event.target.parentElement.className) < 0) {
                    provided.dragHandleProps.onMouseDown(event);
                    }
                };
                })();

            return (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onMouseDown={onMouseDown} className="card bg-secondary mb-3 text-truncate">
                        {title}
                        {body}
                    </div>
                )}}
        </Draggable>
    );
  }
}

function Location(props) {
    return (
        <span className="body-text">
          {props.location[0]}: <StatBadge number={props.location[1]} details={props.details} />
        </span>
    );
}

class LocationsCard extends React.Component {
    constructor(props) {
        super(props);
    }

    render () {
        var elements = [];
        for (var i=0; i < this.props.locations.length; i++) {
        elements.push(<Location key={this.props.locations[i][0]} location={this.props.locations[i]} details={this.props.details[this.props.locations[i][0]]} />);
        }
        return <StatCard index={this.props.index} title="Locations:" body={elements} />;
    }
}

function Ship(props) {
    return (
        <div>
          <span className="body-text">
          {props.img}{props.ship[0]}: <StatBadge number={props.ship[1]} details={props.details} />
          </span>
        </div>
    );
}

class ShipsCard extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var elements = [];
        for (var i=0; i < this.props.ships.length; i++) {
        var img = <img height="24px" width="24px" className="mr-1" src={"https://image.eveonline.com/Render/" + this.props.ship_ids[this.props.ships[i][0]] + "_32.png"} />;
        elements.push(<Ship key={this.props.ships[i][0]} ship={this.props.ships[i]} img={img} details={this.props.details[this.props.ships[i][0]]} />);
        }
        return <StatCard index={this.props.index} title="Ship Types:" body={elements} />;
    }
}

function sortDict(dict) {
    var items = Object.keys(dict).map(function(key) {
    return [key, dict[key]];
    });

    items.sort(function(first, second) {
    return second[1] - first[1];
    });

    return items;
}

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

export default class FleetStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = { cards: [], 
        fleet_number: 0, pelds_number: 0, 
        pelds_detail: "",
        locations: [], locations_detail: {},
        ships: [], ship_ids: [], ships_detail: {} 
    };
    this.update = true;
    socket.on('fleet_update', (data) => {
      if (this.update) {
        this.fleetUpdate(JSON.parse(data));
      }
    });
    this.onDragEnd = this.onDragEnd.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
  }

  updateStats(member) {
      this.addToStat(this.fleet_locations, member['location_name'])
      this.addToDetail(this.fleet_locations_detail, member['location_name'], member['character_name'])
      this.addToStat(this.fleet_ships, member['ship_name'])
      this.addToDetail(this.fleet_ships_detail, member['ship_name'], member['character_name'])
      this.fleet_ship_ids[member['ship_name']] = member['ship_type_id']
      this.fleet_count += 1;
      if (member['peld_connected']) {
          this.pelds_count += 1;
      }
      else {
          this.pelds_detail += "<br />"+member['character_name']
      }
  }

  fleetUpdate(fleet) {
    this.fleet_locations = {};
    this.fleet_locations_detail = {};
    this.fleet_ships = {};
    this.fleet_ship_ids = {};
    this.fleet_ships_detail = {};
    this.fleet_count = 0;
    this.pelds_count = 0;
    this.pelds_detail = "Not Connected:";
    if ('fleet_commander' in fleet) {
      this.updateStats(fleet['fleet_commander']);
    }
    for (var i=0; i < fleet.wings.length; i++){
      var wing = fleet.wings[i];
      var squads = [];
      if ('wing_commander' in wing) {
        this.updateStats(wing['wing_commander']);
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        var squad_members = [];
        if ('squad_commander' in squad) {
          this.updateStats(squad['squad_commander']);
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            this.updateStats(squad.members[k]);
          }
        }
      }
    }
    this.fleet_locations = sortDict(this.fleet_locations);
    this.fleet_ships = sortDict(this.fleet_ships);
    if (this.state.cards.length == 0) {
      this.state.cards.push(<StatCard index={0} key="In fleet" title="In fleet: " number={this.state.fleet_number} />);
      this.state.cards.push(<StatCard index={1} key="PELDs Connected" title="PELDs Connected: " number={this.state.pelds_number} details={this.state.pelds_detail} />);
      this.state.cards.push(<LocationsCard index={2} key="Locations" locations={this.state.locations} details={this.state.locations_detail} />);
      this.state.cards.push(<ShipsCard index={3} key="Ship Types" ships={this.state.ships} ship_ids={this.state.ship_ids} details={this.state.ships_detail} />);
    }
    if (this.update) {
        this.setState({
            fleet_number: this.fleet_count,
            pelds_number: this.pelds_count+"/"+this.fleet_count,
            pelds_detail: this.pelds_detail,
            locations: this.fleet_locations,
            locations_detail: this.fleet_locations_detail,
            ships: this.fleet_ships,
            ships_detail: this.fleet_ships_detail,
            ship_ids: this.fleet_ship_ids
        });
    }
  }

  addToStat(items, item) {
      if (item in items) {
          items[item] += 1;
      }
      else {
          items[item] = 1;
      }
  }

  addToDetail(items, item, name) {
      if (item in items) {
          items[item] += "<br />" + name;
      }
      else {
          items[item] = name;
      }
  }

  onDragEnd(result) {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const cards = reorder(
      this.state.cards,
      result.source.index,
      result.destination.index
    );
    
    this.setState({
      cards: cards
    });

    this.update = true;
  }

  onDragStart() {
    this.update = false;
  }

  render () {
    if ( this.state.cards.length == 0 ) {
      return <div>Getting fleet data...</div>;
    }
    var new_cards = [];
    for (var i=0; i < this.state.cards.length; i++) {
        switch (this.state.cards[i].key) {
            case "In fleet":
              new_cards.push(<StatCard index={i} key="In fleet" title="In fleet: " number={this.state.fleet_number} />);
              break;
            case "PELDs Connected":
              new_cards.push(<StatCard index={i} key="PELDs Connected" title="PELDs Connected: " number={this.state.pelds_number} details={this.state.pelds_detail} />);
              break;
            case "Locations":
              new_cards.push(<LocationsCard index={i} key="Locations" locations={this.state.locations} details={this.state.locations_detail} />);
              break;
            case "Ship Types":
              new_cards.push(<ShipsCard index={i} key="Ship Types" ships={this.state.ships} ship_ids={this.state.ship_ids} details={this.state.ships_detail} />);
              break;
            default:
              break;
        }
    }
    this.state.cards = new_cards;
    return (
      <span>
        <div className="w-100 p-1 mb-2 text-center sticky-top border-bottom bg-light border-secondary text-truncate">
            <h5 className="m-0">Fleet Stats</h5>
        </div>
        <div className="p-2">
          <DragDropContext onDragStart={this.onDragStart} onDragEnd={this.onDragEnd} type="FLEET_MEMBER">
            <Droppable droppableId="statDrop">
                {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {this.state.cards}
                  {provided.placeholder}
                </div>
                )}
            </Droppable>
          </DragDropContext>
        </div>
      </span>
    );
  }
}
