import {
  Component, Input, ElementRef, AfterViewInit, ViewChild
} from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { switchMap, takeUntil, pairwise } from 'rxjs/operators'
import * as tf from '@tensorflow/tfjs';
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

  @ViewChild('canvas') public canvas: ElementRef;

  @Input() public width =  Math.ceil(window.innerWidth * 50 / 100) - 25;
  @Input() public height = Math.ceil(window.innerWidth * 50 / 100) - 25;

  private cx: CanvasRenderingContext2D;
  
  changePencil(e) {
	  let index = e.target.selectedIndex;
	  this.thickness = index + 1;
	  this.cx.lineWidth = this.thickness;
  }
  
  
  public async ngAfterViewInit() {
	this.model = await tf.loadLayersModel("assets/model.json");

    const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
    this.cx = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.cx.lineWidth = this.thickness;
    this.cx.lineCap = 'round';
    this.cx.strokeStyle = '#fff';

	this.cx.fillStyle = "#000";
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
	this.cx.fillStyle = "#000";
	this.cx.fillRect(0, 0, this.width, this.height);
	this.cx.fill();
  }

  predict() { 
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
  }
}
