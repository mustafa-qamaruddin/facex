import {
  Component, Input, ElementRef, AfterViewInit, ViewChild
} from '@angular/core';
import { fromEvent, merge } from 'rxjs';
import { switchMap, takeUntil, pairwise } from 'rxjs/operators'
import * as tf from '@tensorflow/tfjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  title = 'facex';
  prediction = NaN;
  probability = 0;
  thickness = 2;
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

  @Input() public width =  Math.ceil(window.innerWidth * 50 / 100) - 50;
  @Input() public height = Math.ceil(window.innerWidth * 50 / 100) - 50;

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
    this.cx.strokeStyle = '#000';

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
	
	const canvasEl: HTMLCanvasElement = this.canvas.nativeElement;
	this.sample = canvasEl.toDataURL();
	let image = tf.browser.fromPixels(canvasEl);
	image = tf.image.resizeBilinear(image, [28, 28]);
	image = image.mean(2);
	const batch = tf.tensor4d(Array.from(image.dataSync()),[1,28,28,1]);
	// this.prediction = this.model.predict(batch);
  }
  
  reset() {
	this.cx.clearRect(0, 0, this.width, this.height);
  }

}
