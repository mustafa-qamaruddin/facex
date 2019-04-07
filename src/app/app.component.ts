import {
  Component, Input, ElementRef, AfterViewInit, ViewChild
} from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { switchMap, takeUntil, pairwise } from 'rxjs/operators'
import * as tf from '@tensorflow/tfjs';
import { ChartOptions, ChartType, ChartDataSets } from 'chart.js';
import * as pluginDataLabels from 'chartjs-plugin-datalabels';
import { Label } from 'ng2-charts';
import { getDataUrlFromArr } from 'array-to-image';
import * as mobilenet from '@tensorflow-models/mobilenet';


tf.ENV.set('WEBGL_PACK', false)


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'facex';
  prediction:any = NaN;
  probability:number = NaN;
  thickness = 5;
  labels = [
	'T-shirt/top',
	'Trouser',
	'Pullover',
	'Dress',
	'Coat',
	'Sandal',
	'Shirt',
	'Sneaker',
	'Bag',
	'Ankle boot'
	];
  sample = "";
  model:any;
  model_name = "CNN on Convoluted Sketch Fashion MNIST";
  display_sketch = true;
  pen_color = "#000"
  bg_color = "#fff"
  interim = null;
  display_training = false;
  mobilenet_model:any = null;
  trained_samples = 0;


  public barChartOptions: ChartOptions = {
    responsive: true,
    // We use these empty structures as placeholders for dynamic theming.
    scales: { xAxes: [{
        }], yAxes: [{
        }] },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'end',
      }
    }
  };
  public barChartLabels: Label[] = this.labels;
  public barChartType: ChartType = 'horizontalBar';
  public barChartLegend = false;
  public barChartPlugins = [pluginDataLabels];

  public barChartData: ChartDataSets[] = [
    { data: [0,0,0,0,0,0,0,0,0,0] }
  ];

  @ViewChild('canvas') public canvas: ElementRef;

  @Input() public width =  Math.ceil(window.innerWidth * 25 / 100) - 25;
  @Input() public height = Math.ceil(window.innerWidth * 25 / 100) - 25;

  private cx: CanvasRenderingContext2D;
  
  changePencil(e) {
	  let index = e.target.selectedIndex;
	  this.thickness = index + 1;
	  this.cx.lineWidth = this.thickness;
  }
  
  
  public async ngAfterViewInit() {
	this.model = await tf.loadLayersModel("assets/modelb/model.json");

    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    this.cx = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.cx.lineWidth = this.thickness;
    this.cx.lineCap = 'round';
    
    if ( this.display_sketch ) {
        this.cx.strokeStyle = this.pen_color;
        this.cx.fillStyle = this.bg_color;
    } else {
        this.cx.strokeStyle = this.pen_color;    
    	this.cx.fillStyle = this.bg_color;
    }
	this.cx.fillRect(0, 0, canvasEl.width, canvasEl.height);
	this.cx.fill();

    this.captureEvents(canvasEl);
	this.sample = canvasEl.toDataURL();
    
    this.mobilenet_model = await mobilenet.load();
  }
  
  private captureEvents(canvasEl: HTMLCanvasElement) {
    // this will capture all mousedown events from the canvas element
    fromEvent(canvasEl, 'mousedown')
      .pipe(
        switchMap((e) => {
          // after a mouse down, we'll record all mouse moves
          return fromEvent(canvasEl, 'mousemove')
            .pipe(
              // we'll stop (and unsubscribe) once the user releases the mouse
              // this will trigger a 'mouseup' event    
              takeUntil(fromEvent(canvasEl, 'mouseup')),
              // we'll also stop (and unsubscribe) once the mouse leaves the canvas (mouseleave event)
              takeUntil(fromEvent(canvasEl, 'mouseleave')),
              // pairwise lets us get the previous value to draw a line from
              // the previous point to the current point    
              pairwise()
            )
        })
      ).subscribe((res: [MouseEvent, MouseEvent]) => {
        const rect = canvasEl.getBoundingClientRect();
  
        // previous and current position with the offset
        const prevPos = {
          x: res[0].clientX - rect.left,
          y: res[0].clientY - rect.top
        };
  
        const currentPos = {
          x: res[1].clientX - rect.left,
          y: res[1].clientY - rect.top
        };
  
        // this method we'll implement soon to do the actual drawing
        this.drawOnCanvas(prevPos, currentPos);
      });
	
	fromEvent(canvasEl, 'touchstart')
		.pipe(
			switchMap((e) => {
			  e.preventDefault();
			  // after a mouse down, we'll record all mouse moves
			  return fromEvent(canvasEl, 'touchmove')
				.pipe(
				  // we'll stop (and unsubscribe) once the user releases the mouse
				  // this will trigger a 'mouseup' event    
				  takeUntil(fromEvent(canvasEl, 'touchend')),
				  // we'll also stop (and unsubscribe) once the mouse leaves the canvas (mouseleave event)
				  takeUntil(fromEvent(canvasEl, 'touchleave')),
				  // pairwise lets us get the previous value to draw a line from
				  // the previous point to the current point    
				  pairwise()
				)
			})
		).subscribe((res: [TouchEvent, TouchEvent]) => {
			const rect = canvasEl.getBoundingClientRect();
	  
			// previous and current position with the offset
			const prevPos = {
			  x: res[0].targetTouches[0].clientX - rect.left,
			  y: res[0].targetTouches[0].clientY - rect.top
			};
	  
			const currentPos = {
			  x: res[1].targetTouches[0].clientX - rect.left,
			  y: res[1].targetTouches[0].clientY - rect.top
			};
	  
			// this method we'll implement soon to do the actual drawing
			this.drawOnCanvas(prevPos, currentPos);
		});
  }

  private drawOnCanvas(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }) {
    if (!this.cx) { return; }

    this.cx.beginPath();

    if (prevPos) {
      this.cx.moveTo(prevPos.x, prevPos.y); // from
      this.cx.lineTo(currentPos.x, currentPos.y);
      this.cx.stroke();
    }
  }
  
  reset() {
	this.cx.clearRect(0, 0, this.width, this.height);
    if ( this.display_sketch ) {
        this.cx.fillStyle = this.bg_color;
    } else {
	   this.cx.fillStyle = this.bg_color;
    }
	this.cx.fillRect(0, 0, this.width, this.height);
	this.cx.fill();
    this.interim = null;
  }

  predict() {
    this.interim = null;
    const b = tf.scalar(255);
	const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    let batch = null;
    if ( this.display_training ) {
        batch = this.mobilenet_model.infer(this.canvas.nativeElement, 'conv_preds');
    } else {
    	this.sample = canvasEl.toDataURL();
    	let image = tf.browser.fromPixels(canvasEl);
    	
    	image = tf.image.resizeBilinear(image, [28, 28]);
    	image = image.mean(2);
    	image = image.toFloat();
    	image = image.div(b);
    	batch = tf.tensor4d(Array.from(image.dataSync()),[1,28,28, 1]);
    }
	//console.log(batch.dataSync());
	let probs = this.model.predict(batch).squeeze();
	this.probability = Math.round(tf.max(probs).dataSync()[0] * 100);
	//console.log(probs.shape, tf.argMax(probs).dataSync()[0]);
    let max_index = tf.argMax(probs).dataSync()[0];
	this.prediction = this.labels[max_index];
    this.barChartData[0].data = probs.dataSync();
    
    let colors: Array<string> = Array();
    for ( let cx = 0; cx < this.labels.length; cx++) {
        if ( cx == max_index ) {
            colors.push("#00ff00");
        } else {
            colors.push("#0000ff");
        }
    }
      
    this.barChartData[0].backgroundColor = colors;
    if ( this.display_training ) {
        return;
    }
      
    this.interim = {};
    let o1 = batch;
    for ( let i in this.model.layers) {
        let name = this.model.layers[i].name;
        
        if ( name.indexOf("flatten") !== -1 ) {
            break;
        }
        
        let l = this.model.layers[i];
        let temp = l.apply(o1);
        temp = temp.mul(b);
        let shape = temp.shape;
        let buffer = temp.dataSync();
        let shape_len = shape.length;
        
        let w = shape[1];
        let h = shape[2];
        let images_interim = Array();
        for ( let j = 0; j < shape[shape_len-1]; j++) {
            let start = j * (w * h);
            let end = start + (w*h);
            let im_data = buffer.slice(start, end + 1);
            let im = getDataUrlFromArr(im_data, w, h);
            images_interim.push(im);
        }
        this.interim[l.name]  = images_interim;
        o1 = temp;
    }
  }
    
    
  async changeModel(e) {
      let index = e.target.selectedIndex;
      if ( index == 0) {
            this.model_name = "CNN on Fashion MNIST";
            this.model = await tf.loadLayersModel("assets/model.json");
            this.display_sketch = false;
            this.display_training = false;
      } else if ( index == 1) {
            this.model_name = "CNN on Convoluted Sketch Fashion MNIST";
            this.model = await tf.loadLayersModel("assets/modelb/model.json");
            this.display_sketch = true;
            this.display_training = false;
      } else {
            this.model_name = "Transfer Learning Mobile Net in the Browser";
            this.createMLP(10);
            this.display_sketch = false;
            this.display_training = true;
      }
  }
  
  changePen(e) {
      let index = e.target.selectedIndex;
      this.cx.strokeStyle = e.target.options[index].value;
      this.pen_color = e.target.options[index].value;
  }
    
  changeBG(e) {
      let index = e.target.selectedIndex;
      this.cx.fillStyle = e.target.options[index].value;
      this.bg_color = e.target.options[index].value;
      this.reset();
  }
  
  createMLP(in_length) {
    // A sequential model is a container which you can add layers to.
    this.model = tf.sequential();
    
    // Add a dense layer with 10 output unit.
    this.model.add(tf.layers.dense({units: in_length, inputShape: [1024]}));
    this.model.add(tf.layers.activation({activation: 'softmax'}));
    
    // Specify the loss type and optimizer for training.
    this.model.compile({loss: 'meanSquaredError', optimizer: 'SGD'});
    
      
    console.log(this.model);
  }
  
  async trainModel(event) {
    let sel:HTMLSelectElement = <HTMLSelectElement>document.getElementById('sample-label');
    let val = sel.options[sel.selectedIndex].value;
    let y = tf.oneHot(tf.tensor1d([val], 'int32'), sel.options.length);
    console.log(val, y.dataSync());
    // Get the intermediate activation of MobileNet 'conv_preds' and pass that
    // to the KNN classifier.
    let x = this.readImageFromCanvas();
    const activation = this.mobilenet_model.infer(this.canvas.nativeElement, 'conv_preds');
    console.log(activation.shape);

    // Train the model.
    await this.model.fit(activation, y, {epochs: 1});
    
    this.trained_samples ++;
  }
  
  readImageFromCanvas(){
        const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
        this.sample = canvasEl.toDataURL();
        let image = tf.browser.fromPixels(canvasEl);
        
        image = tf.image.resizeBilinear(image, [28, 28]);
        image = image.mean(2);
        image = image.toFloat();
        const b = tf.scalar(255);
        image = image.div(b);
        return tf.tensor4d(Array.from(image.dataSync()),[1,28,28, 1]);
  }
    
    
  AddNewLabel() {
      let input:HTMLInputElement = <HTMLInputElement> document.getElementById('new-label');
      console.log(input.value);
      
      // append to select
      let sel:HTMLSelectElement = <HTMLSelectElement>document.getElementById('sample-label');
      let opt = document.createElement('option');
      opt.appendChild( document.createTextNode(input.value) );
      opt.value = sel.options.length;   
      sel.appendChild(opt);
      
      // append to labels of predictions
      this.labels.push(input.value);
      
      // change model
      this.createMLP(sel.options.length);
  }
}
