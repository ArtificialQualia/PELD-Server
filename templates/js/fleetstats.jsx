import React from "react";
import { handle_fleet_update } from "./index";
import { register_handler } from "./index";

function StatCard(props) {
  var title = ""
  if ( props.title ) {
  title = <div className="card-header bg-light p-2">{props.title}</div>
  }
  var body = ""
  if ( props.body ) {
  body = (
    <div className="card-body bg-light p-2">
      <div className="card-text">{props.body}</div>
    </div>
  );
  }
  return (
    <div className="card bg-secondary mb-3 text-truncate">
        {title}
        {body}
    </div>
  );
}

function Location(props) {
    return (
        <div>{props.location[0]}: 
          <div className="my-auto align-center badge badge-secondary ml-1" style={{fontSize: "85%"}}>
            {props.location[1]}
          </div>
        </div>
    );
}

function LocationsCard(props) {
    var elements = [];
    for (var i=0; i < props.locations.length; i++) {
      elements.push(<Location key={props.locations[i][0]} location={props.locations[i]} />);
    }
    return <StatCard  title="Locations:" body={elements} />;
}

function Ship(props) {
    return (
        <div>{props.img}{props.ship[0]}: 
          <div className="my-auto align-center badge badge-secondary ml-1" style={{fontSize: "85%"}}>
            {props.ship[1]}
          </div>
        </div>
    );
}

function ShipsCard(props) {
    var elements = [];
    for (var i=0; i < props.ships.length; i++) {
      var img = <img height="24px" width="24px" className="mr-1" src={"https://image.eveonline.com/Render/" + props.ship_ids[props.ships[i][0]] + "_32.png"} />;
      elements.push(<Ship key={props.ships[i][0]} ship={props.ships[i]} img={img} />);
    }
    return <StatCard  title="Ship Types:" body={elements} />;
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

export default class FleetStats extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fleet: 'Getting fleet data...' };
    handle_fleet_update((data) => {
      this.setState({ fleet: JSON.parse(data) });
    });
  }

  addToStat(items, item) {
      if (item in items) {
          items[item] += 1;
      }
      else {
          items[item] = 1;
      }
  }

  render () {
    if ( this.state.fleet == "Getting fleet data..." ) {
      return <div>{this.state.fleet}</div>;
    }
    var fleet_locations = {};
    var fleet_ships = {};
    var fleet_ship_ids = {};
    var fleet_count = 0;
    if ('fleet_commander' in this.state.fleet) {
      this.addToStat(fleet_locations, this.state.fleet['fleet_commander']['location_name'])
      this.addToStat(fleet_ships, this.state.fleet['fleet_commander']['ship_name'])
      fleet_ship_ids[this.state.fleet['fleet_commander']['ship_name']] = this.state.fleet['fleet_commander']['ship_type_id']
      fleet_count += 1;
    }
    else {
    }
    for (var i=0; i < this.state.fleet.wings.length; i++){
      var wing = this.state.fleet.wings[i];
      var squads = [];
      if ('wing_commander' in wing) {
        this.addToStat(fleet_locations, wing['wing_commander']['location_name'])
        this.addToStat(fleet_ships, wing['wing_commander']['ship_name'])
        fleet_ship_ids[wing['wing_commander']['ship_name']] = wing['wing_commander']['ship_type_id']
        fleet_count += 1;
      }
      else {
      }
      for (var j=0; j < wing.squads.length; j++) {
        var squad = wing.squads[j];
        var squad_members = [];
        if ('squad_commander' in squad) {
          this.addToStat(fleet_locations, squad['squad_commander']['location_name'])
          this.addToStat(fleet_ships, squad['squad_commander']['ship_name'])
          fleet_ship_ids[squad['squad_commander']['ship_name']] = squad['squad_commander']['ship_type_id']
          fleet_count += 1;
        }
        else {
        }
        if ('members' in squad) {
          for (var k=0; k < squad.members.length; k++){
            this.addToStat(fleet_locations, squad.members[k]['location_name'])
            this.addToStat(fleet_ships, squad.members[k]['ship_name'])
            fleet_ship_ids[squad.members[k]['ship_name']] = squad.members[k]['ship_type_id']
            fleet_count += 1;
          }
        }
        else {
        }
      }
    }
    fleet_locations = sortDict(fleet_locations);
    fleet_ships = sortDict(fleet_ships);
    return (
      <span>
        <div className="w-100 p-1 mb-2 text-center sticky-top border-bottom bg-light border-secondary text-truncate">
            <h5 className="m-0">Fleet Stats</h5>
        </div>
        <div className="p-2">
            <StatCard title={"In fleet: " + fleet_count} />
            <LocationsCard locations={fleet_locations} />
            <ShipsCard ships={fleet_ships} ship_ids={fleet_ship_ids} />
        </div>
      </span>
    );
  }
}
