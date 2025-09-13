package org.herac.tuxguitar.gui.rxtx;


import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import org.herac.tuxguitar.gui.TuxGuitar;
import org.eclipse.swt.widgets.Shell;
import org.herac.tuxguitar.gui.TuxGuitar;
import org.herac.tuxguitar.gui.editors.TGExternalBeatViewerListener;
import org.herac.tuxguitar.gui.editors.TGRedrawListener;
import org.herac.tuxguitar.gui.editors.TGUpdateListener;
import org.herac.tuxguitar.gui.editors.tab.TGNoteImpl;
import org.herac.tuxguitar.gui.system.plugins.TGPluginException;
import org.herac.tuxguitar.gui.system.plugins.TGPluginSetup;
import org.herac.tuxguitar.gui.system.plugins.base.TGPluginAdapter;
import org.herac.tuxguitar.gui.util.MessageDialog;
import org.herac.tuxguitar.song.models.TGBeat;
import org.herac.tuxguitar.song.models.TGNote;
import org.herac.tuxguitar.song.models.TGVoice;
import org.herac.tuxguitar.gui.rxtx.rxtxSerialCommunicator;

public class TGrxtxPluginImpl extends TGPluginAdapter implements TGPluginSetup, TGExternalBeatViewerListener, TGRedrawListener, TGUpdateListener{
	private int beatIdx = 0;
	
	private TGBeat beat;
	private TGBeat externalBeat;
	private  List lastNotes=new ArrayList();
	private rxtxSerialCommunicator serial;
    private byte[][]octaves= new byte[][]{
    		  { 0, 0, 0, 0, 0, 1 },
    		  { 0, 0, 0, 0, 0, 1 },
    		  { 0, 1, 2, 1, 0, 1 },
    		  { 1, 1, 2, 1, 1, 2 },
    		  { 1, 1, 2, 2, 1, 2 },
    		  { 2, 2, 3, 2, 3, 3 },
    		  { 2, 2, 3, 2, 3, 3 },
    		  { 3, 4, 4, 3, 3, 4 },
    		  { 3, 4, 4, 3, 4, 4 },
    		  { 3, 4, 5, 5, 4, 4 },
    		  { 4, 5, 5, 5, 5, 5 },
    		  { 4, 5, 5, 5, 5, 5 },
    		  { 6, 6, 6, 6, 6, 7 },
    		  { 6, 6, 6, 6, 6, 7 },
    		  { 6, 7, 8, 7, 6, 7 },
    		  { 7, 7, 8, 7, 7, 8 },
    		  { 7, 7, 8, 8, 7, 8 },
    		  { 8, 8, 9, 8, 9, 9 },
    		  { 8, 8, 9, 8, 9, 9 },
    		  { 9, 10, 10, 9, 9, 10 },
    		  { 9, 10, 10, 9, 10, 10 },
    		  { 9, 10, 11, 11, 10, 10 }
    		};
    
    private byte[][]Notes= new byte[][]{
  	  	  	  { 7, 0, 5, 10,2, 7 },
    		  { 8, 1,6,11, 3, 8 },
    		  { 9,2, 7, 0, 4, 9 },
    		  { 10, 3, 8, 1, 5, 10 },
    		  { 11,4,9, 2, 6, 11 },
    		  { 0, 5, 10, 3, 7, 0 },
    		  { 1,6, 11, 4, 8, 1 },
    		  { 2, 7, 0, 5, 9, 2 },
    		  { 3, 8, 1, 6, 10, 3 },
    		  { 4,9, 2, 7, 11, 4 },
    		  { 5, 10, 3, 8, 0, 5 },
    		  { 6, 11, 4, 9, 1, 6 },
    		  { 7, 0, 5, 10, 2, 7 },
    		  { 7, 0, 5, 10,2, 7 },
    		  { 8, 1,6,11, 3, 8 },
    		  { 9,2, 7, 0, 4, 9 },
    		  { 10, 3, 8, 1, 5, 10 },
    		  { 11,4,9, 2, 6, 11 },
    		  { 0, 5, 10, 3, 7, 0 },
    		  { 1,6, 11, 4, 8, 1 },
    		  { 2, 7, 0, 5, 9, 2 },
    		  { 3, 8, 1, 6, 10, 3 },
    		  { 4,9, 2, 7, 11, 4 },
    		  { 5, 10, 3, 8, 0, 5 },
    		  { 6, 11, 4, 9, 1, 6 },
    		  { 7, 0, 5, 10, 2, 7 }
  		};
   // Serial.write(B01000000);// reset SMARTLIGHT
    // Serial.write(64);// reset SMARTLIGHT
   // Serial.write(B01000101);// command to trun led on
   // Serial.write(B01000100);// command to trun led off
    
	public byte getOctave(int fret,int string) {
		return octaves[fret][string];
	}



	public byte getNote(int fret,int string) {
		return Notes[fret][string];
	}



	public String getName() {
		return "SmartLight plugin";
	}

	public String getAuthor() {
		return "Mohamed Elkafouri";
	}

	public String getDescription() {
		return "This plugin is to light notes on the old SmartLight gUitar";
	}

	public String getVersion() {
		return "1.0";
	}


	
	//serial communications
	public void init() throws TGPluginException{
	// 	MessageDialog.infoMessage("init gdp", "initilizing guitarduino");
		try { 

			
			TuxGuitar.instance().getEditorManager().addBeatViewerListener(this);
			TuxGuitar.instance().getEditorManager().addRedrawListener(this);
			TuxGuitar.instance().getEditorManager().addUpdateListener(this);
				
			//this.composite.addPaintListener(this);
			//TuxGuitar.instance().getkeyBindingManager().appendListenersTo(this.composite);
			//TuxGuitar.instance().getTransport();
			System.out.println("smartlight plugin init");

			this.serial = new rxtxSerialCommunicator();
			// elkafoury enable this when the above doesnt error
	        this.serial.connect();

	        if (this.serial.getConnected() == true) {
	    		System.out.println("Connected to port");
	                if (this.serial.initIOStream() == true) {
	                        this.serial.initListener();
	            	        this.serial.writeData(64); // reset all leds upon connecting
	            	        this.serial.flush();
	                }
	        }

			
		} catch (Exception e){
        	MessageDialog.errorMessage(new TGPluginException("kafka Failed to init plugin ",e));

		}
		
		
		
	}
	
	public void close() throws TGPluginException{
		if (serial != null) {
			this.serial.disconnect();
		}
	}
	
	



	public void setEnabled(boolean enabled) throws TGPluginException {

	}

	//tgpluginsetup methods:
	public void setupDialog(Shell parent){  
		
		rxtxSettingsUtil.instance().configure(parent);
		
	}
	@Override
	public void doRedraw(int type) {
		try {
		if( type == TGRedrawListener.NORMAL ){
//
		}else if( type == TGRedrawListener.PLAYING_NEW_BEAT ){
			 System.out.println("doRedraw() BEAT");
			 // elkafoury moved these two lines here
	 	        //List  lastNotes =new ArrayList(); 
 			setBeat(this.lastNotes );
 	       this.lastNotes=this.lightBeats(this.beat);
 	      
		}
		//	setBeat();
		//	this.dumpBeats(this.beat);
		} catch (Exception e) { 
			// do nothing
		}
	}
	
	public void turnOffBeats ( List lastNotes  ) {
		
	        int fretIndex=-1,stringIndex=-1,smStringIndex=-1;
 
			 
			  for (int i = 0; i < lastNotes.size(); i++) {
				  TGNoteImpl note = (TGNoteImpl)lastNotes.get(i);     
				  fretIndex = note.getValue();								  				
				  stringIndex = note.getString() ;
				  smStringIndex=6-stringIndex;
				//el traste 0 es al aire - ahora lo ignoramos
				  System.out.println("turning off "+ "string: " + stringIndex + " fret: " + fretIndex);
				//smartlight communications 
							if (serial != null && fretIndex!=-1) {
			 		            //this.serial.writeData(GDPSerialCommunicator.NEW_LINE_ASCII);
								System.out.println("OFF  String " + stringIndex + " fret: " + fretIndex );
								  this.serial.writeData(68);// command to trun led off
								  this.serial.writeData(getNote(fretIndex,smStringIndex ));// command to note
								  this.serial.writeData(getOctave(fretIndex,smStringIndex ));// command to octave
								  this.serial.flush();
									System.out.println("flushed OFF "  );
								 
					        }
 
	
		
	 	
	}

	}
	
	
	
	
	
	
	
	
	
	@Override
	public void doUpdate(int type) {
		 System.out.println("doUpdate()");
		 // elkafoury removed those two:
//		setBeat();
//		dumpBeats(this.beat);
		 //elkafoury added the reset 
			if (serial != null) {
			this.serial.writeData(64); // reset all leds  
			}
	}

	@Override
	public void showExternalBeat(TGBeat beat) {
		System.out.println("showExternalBeat()");
	}
	
	private void setBeat( List lastNotes){
		try{
		 if (lastNotes!=null){
	    	  turnOffBeats(this.lastNotes);
	       }
		
		
		if(TuxGuitar.instance().getPlayer().isRunning()){
			this.beat = TuxGuitar.instance().getEditorCache().getPlayBeat();
		}else if(this.externalBeat != null){
			//vienen de la entrada midi.
			//this.beat = this.externalBeat;
		}else{
			//?????????????  do we need to reset  if player isnt running?
			if (serial != null) {
			this.serial.writeData(64); // reset all leds upon connecting
			}
	        
			this.beat = TuxGuitar.instance().getEditorCache().getEditBeat();
		}
		
		} catch (Exception e) {  

	        System.out.println("exception caught in setbeat");
		}
	}

	@Override
	public void hideExternalBeat() {
		// TODO Auto-generated method stub
		
	}
	
	private List lightBeats(TGBeat beat) {

		if (beat == null){
			return null;
		}
		
		System.out.println("dumpbeats called  " + this.beatIdx);
		System.out.println("BEAT idx = " + this.beatIdx);

        System.out.println("voices:"+beat.countVoices());
        
        //elkafoury test
        int fretIndex=-1,stringIndex=-1,smStringIndex=-1;
        
        List  lastNotes =new ArrayList(); 
				        for(int v = 0; v < beat.countVoices(); v ++){
				        	TGVoice voice = beat.getVoice( v );
				        	 List n = voice.getNotes();
				        	int noOfNotes=n.size() ;
				        	 System.out.println("there are "+ noOfNotes +"note(s) in voice "+v);
				     		TGNoteImpl note ;
				    		boolean firstNote;    		
				    		//turn off last note 
				    		        if( noOfNotes>0   ){
				    		        	lastNotes= (List) ((ArrayList) n).clone(); // register this as last note so we can turn it off later
								    		for (int i = 0; i < noOfNotes; i++) {
								  			  note = (TGNoteImpl)n.get(i);     
//								  				
//													  				if ((noOfNotes>1||noOfNotes==1)&& i==0)
//													  				{
//													  					firstNote=true;
//													  					}else{
//													  					firstNote=false;
//													  				}
//								  				
								  				  fretIndex = note.getValue();
								  				
												  stringIndex = note.getString() ;
												  smStringIndex=6-stringIndex;
												//el traste 0 es al aire - ahora lo ignoramos
											//	System.out.println("string: " + stringIndex + " fret: " + fretIndex );
												//smartlight communications 
															if (serial != null) {
							
											 		            //this.serial.writeData(GDPSerialCommunicator.NEW_LINE_ASCII);
																System.out.println("lighting String " + stringIndex + " fret: " + fretIndex );
																  this.serial.writeData(69);// command to trun led on
																  this.serial.writeData(getNote(fretIndex,smStringIndex ));// command to note
																  this.serial.writeData(getOctave(fretIndex,smStringIndex ));// command to octave
																//  this.serial.flush();
																//	System.out.println("flushing after lighting " );
													        }
								    		}
				    		        }

				        }

        // elkafoury test end
/*		for(int v = 0; v < beat.countVoices(); v ++){
			TGVoice voice = beat.getVoice( v );
			Iterator it = voice.getNotes().iterator();
			while (it.hasNext()) {
				TGNote note = (TGNote) it.next();
				int fretIndex = note.getValue();
	
				int stringIndex = note.getString() ;
				int smStringIndex=6-stringIndex;
				//el traste 0 es al aire - ahora lo ignoramos
				System.out.println("string: " + stringIndex + " fret: " + fretIndex );

			//smartlight
				
				
				if (serial != null) {

 		            //this.serial.writeData(GDPSerialCommunicator.NEW_LINE_ASCII);
					
					  this.serial.writeData(69);// command to trun led on
					  this.serial.writeData(getNote(fretIndex,smStringIndex ));// command to note
					  this.serial.writeData(getOctave(fretIndex,smStringIndex ));// command to octave
					  
					  this.serial.writeData(68);// command to trun led off
					  this.serial.writeData(getNote(fretIndex,smStringIndex ));// command to note
					  this.serial.writeData(getOctave(fretIndex,smStringIndex ));// command to octave

					
		            this.serial.flush();
		        }
		
			}
        }
	*/	


		this.beatIdx++;
		return lastNotes;
	}
	
	public void notifyStarted() {
		
	}
	
	public void notifyStopped() {
		
	}
	
	public void notifyLoop() {
		
	}

}
