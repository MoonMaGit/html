class Particle{
	mouse = {
		position: [0, 0],
		click: false,
		down: false,
		up: false
	};
	time = 0;
	data = [];
	relationship = {};
	relation = null;
	create = null;
	running = false;
	clear = null;
	paintbrush = null;
	
	static getOneParicle(){
		return {
			id: null,
			position: [],
			status: {},
			track: function(time, mouse, relationship){
				
			},
			turn: function(time, mouse, relationship){
				
			}
		};
	}
	
	constructor(data, relation, create){
		this.data = data;
		this.relation = relation;
		this.create = create;
	}
	
	getMouse(t){
		return [0, 0];
	}
	
	calculateRelationship(){
		this.relationship = this.relation(this.data, this.relationship);
		this.data = this.create(this.data, this.relationship);
	}
	
	track(t){
		for(let i=0; i<this.data.length; i++){
			let item = this.data[i];
			item.track(t, this.mouse, this.relationship);
		}
	}
	
	turn(t){
		for(let i=0; i<this.data.length; i++){
			let item = this.data[i];
			item.turn(t, this.mouse, this.relationship);
		}
	}
	
	draw(){
		this.clear();
		
		for(let i=0; i<this.data.length; i++){
			let item = this.data[i];
			this.paintbrush(item);
		}
	}
	
	animate = (now)=>{
		var t = now - this.time;
		if(now < 0 || this.time < 0){
			t = 0;
		}
		
		this.mouse = this.getMouse(t);
		this.track(t);
		this.turn(t);
		this.calculateRelationship();
		
		this.time = now;
		
		this.draw();
		
		if(this.running){
			window.requestAnimationFrame(this.animate);	
		}
	};
	
	start(){
		this.running = true;
		this.animate(-1);
	}
	
	stop(){
		this.running = false;
	}
}