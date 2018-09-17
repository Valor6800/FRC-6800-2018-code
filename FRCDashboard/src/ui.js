// Define UI elements
let ui = {
    timer: document.getElementById('timer'),
    camera: document.getElementById('camera'),
    content: document.getElementById('content'),
    robotState: document.getElementById('connection-status'),
    autoSelect: document.getElementById('auto-select'),
    autoPosition: {
        left: document.getElementById('left_start'),
        center: document.getElementById('center_start'),
        right: document.getElementById('right_start')
    },
    lift: {
        liftAssist: document.getElementById('liftAssist'),
        liftPosition: document.getElementById('liftPosition')
    },
    navx: {
        connected: document.getElementById('navx_connected'),
        heading: document.getElementById('navx_heading')
    },
    chassis :{
        speed: document.getElementById('robot_speed')
    }, 
    intake:{
        cube: document.getElementById('has_cube')
    }
};


let default_values = [{path:'starting_position', value:0}, {path:'soft_limits', value: true}, {path:'selected_auto', value:''}, {path:'time', value:'0'}]

// Key Listeners
NetworkTables.addKeyListener('/SmartDashboard/time', (key, value) => {
    // This is an example of how a dashboard could display the remaining time in a match.
    // We assume here that value is an integer representing the number of seconds left.
    ui.timer.innerHTML = value < 0 ? '0:00' : Math.floor(value / 60) + ':' + (value % 60 < 10 ? '0' : '') + value % 60;
});

NetworkTables.addKeyListener('/SmartDashboard/navx_connected', (key, value) => {
    if(value) {
        ui.navx.connected.classList.remove('red')
        ui.navx.connected.classList.add('green')
        ui.navx.connected.innerText = 'CONNECTED'
    } else {
        ui.navx.connected.classList.remove('green')
        ui.navx.connected.classList.add('red')
        ui.navx.connected.innerText = 'DISCONNECTED'
    }
});

NetworkTables.addKeyListener('/SmartDashboard/navx_heading', (key, value) => {
    ui.navx.heading.innerText = parseFloat(value).toFixed(2) + '°'
});

NetworkTables.addKeyListener('/SmartDashboard/lift_position', (key, value) => {
    ui.lift.liftPosition.innerText = (value * 100).toFixed(2) + '%'
});

NetworkTables.addKeyListener('/SmartDashboard/robot_vel', (key, value) => {
    ui.chassis.speed.innerText = (value * 60 /12.0).toFixed(2);
});

NetworkTables.addKeyListener('/SmartDashboard/has_cube', (key, value) => {
    if(value) {
        ui.intake.cube.className = 'green'
        ui.intake.cube.innerText = 'Yes'
    } else {
        ui.intake.cube.className = 'gray'
        ui.intake.cube.innerText = 'No'
    }
});

NetworkTables.addKeyListener('/SmartDashboard/lift_stop', (key, value) => {
    if(value) {
        ui.lift.liftPosition.className = 'red'
    } else {
        ui.lift.liftPosition.className = ''
    }
});

// Load list of prewritten autonomous modes
NetworkTables.addKeyListener('/SmartDashboard/auto_list', (key, value) => {
    // Clear previous list
    while (ui.autoSelect.firstChild) {
        ui.autoSelect.removeChild(ui.autoSelect.firstChild);
    }
    // Make an option for each autonomous mode and put it in the selector
    for (let i = 0; i < value.length; i++) {
        var option = document.createElement('option');
        option.appendChild(document.createTextNode(value[i]));
        ui.autoSelect.appendChild(option);
    }
    // Set value to the already-selected mode. If there is none, nothing will happen.
    ui.autoSelect.value = NetworkTables.getValue('/SmartDashboard/selected_auto');
});

// Update NetworkTables when autonomous selector is changed
ui.autoSelect.onchange = function() {
    NetworkTables.putValue('/SmartDashboard/selected_auto', this.value);
};

var positionSelect = function(button) {
    NetworkTables.putValue('/SmartDashboard/starting_position', parseInt(button.dataset.pos));
}

ui.autoPosition.left.onclick = function() {positionSelect(this);}
ui.autoPosition.center.onclick = function() {positionSelect(this);}
ui.autoPosition.right.onclick = function() {positionSelect(this);}


NetworkTables.addKeyListener('/SmartDashboard/starting_position', (key, value) => {
    ui.autoPosition.left.className = 'gray';
    ui.autoPosition.center.className = 'gray';
    ui.autoPosition.right.className = 'gray';

    switch(value) {
        case -1: ui.autoPosition.left.className = 'blue'; break;
        case 0: ui.autoPosition.center.className = 'blue'; break;
        case 1: ui.autoPosition.right.className = 'blue'; break;
    }
})


ui.lift.liftAssist.onclick = function() {  
    NetworkTables.putValue('/SmartDashboard/soft_limits', !this.classList.contains("green"));
}

NetworkTables.addKeyListener('/SmartDashboard/soft_limits', (key, value) => {
    console.log(value)
    var class_name = "yellow";
    var text = 'DISABLED'
    if(value) {
        text ='ENABLED'
        class_name = "green";
    }
    ui.lift.liftAssist.innerHTML = text;
    ui.lift.liftAssist.className = class_name;
})


ui.camera.onclick = function() {
    this.classList.toggle('fullscreen');
    this.classList.toggle('camera-normal');
    ui.content.style.display = ui.content.style.display === 'none' ? '' : 'none';
    ui.robotState.style.opacity = ui.robotState.style.opacity === '0' ? '1' : '0';
    ui.timer.style.opacity = ui.timer.style.opacity === '0.2' ? '1' : '0.2';
}


NetworkTables.addKeyListener('error',(ev)=>{
    ipc.send('windowError',ev)
})

// Create aliases for various ODM elements relating to tuning.
ui.tuning = {
    list: document.getElementById('tuning'),
    button: document.getElementById('picture'),
    name: document.getElementById('name'),
    value: document.getElementById('value'),
	set: document.getElementById('set'),
	get: document.getElementById('get')
};

// Sets function to be called when any NetworkTables key/value changes
NetworkTables.addGlobalListener(onValueChanged, true);

function onValueChanged(key, value, isNew) {
    // Sometimes, NetworkTables will pass booleans as strings. This corrects for that.
    if (value == 'true') {
        value = true;
    }
    else if (value == 'false') {
        value = false;
    }
    // The following code manages tuning section of the interface.
    // This section displays a list of all NetworkTables variables (that start with /SmartDashboard/) and allows you to directly manipulate them.
    var propName = key.substring(16, key.length);
    // Check if value is new and doesn't have a spot on the list yet
    if (isNew && !document.getElementsByName(propName)[0]) {
        // Make sure name starts with /SmartDashboard/. Properties that don't are technical and don't need to be shown on the list.
        if (/^\/SmartDashboard\//.test(key)) {
            // Make a new div for this value
            var div = document.createElement('div'); // Make div
            ui.tuning.list.appendChild(div); // Add the div to the page
            var p = document.createElement('p'); // Make a <p> to display the name of the property
            p.appendChild(document.createTextNode(propName)); // Make content of <p> have the name of the NetworkTables value
            div.appendChild(p); // Put <p> in div
            var input = document.createElement('input'); // Create input
            input.name = propName; // Make its name property be the name of the NetworkTables value
            input.value = value; // Set
            // The following statement figures out which data type the variable is.
            // If it's a boolean, it will make the input be a checkbox. If it's a number,
            // it will make it a number chooser with up and down arrows in the box. Otherwise, it will make it a textbox.
            if (typeof value === 'boolean') {
                input.type = 'checkbox';
                input.checked = value; // value property doesn't work on checkboxes, we'll need to use the checked property instead
                input.onchange = function () {
                    // For booleans, send bool of whether or not checkbox is checked
                    NetworkTables.putValue(key, this.checked);
                };
            }
            else if (!isNaN(value)) {
                input.type = 'number';
                input.onchange = function () {
                    // For number values, send value of input as an int.
                    NetworkTables.putValue(key, parseInt(this.value));
                };
            }
            else {
                input.type = 'text';
                input.onchange = function () {
                    // For normal text values, just send the value.
                    NetworkTables.putValue(key, this.value);
                };
            }
            // Put the input into the div.
            div.appendChild(input);
        }
    }
    else {
        // Find already-existing input for changing this variable
        var oldInput = document.getElementsByName(propName)[0];
        if (oldInput) {
            if (oldInput.type === 'checkbox') {
                oldInput.checked = value;
            }
            else {
                oldInput.value = value;
            }
        }
        else {
            console.log('Error: Non-new variable ' + key + ' not present in tuning list!');
        }
    }
}

// Open tuning section when button is clicked
ui.tuning.button.onclick = function() {
	if (ui.tuning.list.style.display === 'none') {
		ui.tuning.list.style.display = 'block';
	} else {
		ui.tuning.list.style.display = 'none';
	}
};

// Manages get and set buttons at the top of the tuning pane
ui.tuning.set.onclick = function() {
    if (ui.tuning.name.value && ui.tuning.value.value) { // Make sure the inputs have content
        NetworkTables.putValue('/SmartDashboard/' + ui.tuning.name.value, ui.tuning.value.value);
    }
};
ui.tuning.get.onclick = function() {
	ui.tuning.value.value = NetworkTables.getValue(ui.tuning.name.value);
};

function setDefaultValues() {
    for(value in default_values) {
        NetworkTables.putValue('/SmartDashboard/' + default_values[value].path,  default_values[value].value);
    }
}

setDefaultValues();


