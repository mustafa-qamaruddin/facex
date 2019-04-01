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
  }

  predict() {
    this.interim = null;
	const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
	this.sample = canvasEl.toDataURL();
	let image = tf.browser.fromPixels(canvasEl);
	
	image = tf.image.resizeBilinear(image, [28, 28]);
	image = image.mean(2);
	image = image.toFloat();
	const b = tf.scalar(255);
	image = image.div(b);
	const batch = tf.tensor4d(Array.from(image.dataSync()),[1,28,28, 1]);
	//console.log(batch.dataSync());
	let probs = this.model.predict(batch).squeeze();
	this.probability = Math.round(tf.max(probs).dataSync()[0] * 100);
	//console.log(probs.shape, tf.argMax(probs).dataSync()[0]);
	this.prediction = this.labels[tf.argMax(probs).dataSync()[0]];
    this.barChartData[0].data = probs.dataSync();
    
    this.interim = {};
    let o1 = batch;
    for ( let i in this.model.layers) {
        let name = this.model.layers[i].name;
        
        if ( name.indexOf("flatten") !== -1 ) {
            break;
        }
        
        let l = this.model.layers[i];
        let temp = l.apply(o1);
        console.log(temp.shape, l.name);
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
      } else {
            this.model_name = "CNN on Convoluted Sketch Fashion MNIST";
            this.model = await tf.loadLayersModel("assets/modelb/model.json");
            this.display_sketch = true;
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
}
