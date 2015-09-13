/*
 * YUI plugin. It adds Drag&Drop functionality (for ordering purposes) to all the child elements inside
 * the node where the plugin is invoked. The main node delimits the area where the user can do drag&drop.
 *
 *  Requirements:
 *      -The main node (the one where the plugin is applied), must have an id attribute
 *      -The elements to drag must have the class 'draggable'.They should be direct descendants
 *       of the main node, in order to avoid weird behaviors
 *      -The drag event fires when the user makes click on the area of the element. It's possible
 *       to associate the event to a particular element inside the draggable element (param anchorNode
 *       of makeElementsDraggable method)
 *
 *  Example used as a reference: http://yuilibrary.com/yui/docs/dd/list-drag.html
 */

YUI.add('drag-and-drop-plugin', function(Y) {

    //Constructor
    Y.dragAndDropPlugin = function(config) {
        this._node = config.host;
        this._goingUp = false;
        this._lastY=0;
    };

    //This is necessary for the plugin to work correctly in YUI (http://yuilibrary.com/yui/docs/plugin/)
    Y.dragAndDropPlugin.NS = 'dragAndDrop';

    Y.dragAndDropPlugin.prototype = {

        /*
         * Convert all the elements with the class 'draggable' inside the main node in 'draggable' elements
         * @param anchorNode (optional)    If passed, identifies the element inside each draggable element
         *                                 which triggers the drag event. Otherwise, the user can make click
         *                                 in any part of the element to fire the event
         */
        makeElementsDraggable: function(anchorNode) {
            var node = this._node;

            var nodeId ='#'+this._node.getAttribute('id');

            //Select all draggable elements inside the main node
            var draggableElements = node.all('.draggable');

            draggableElements.each(function(element, index) {
                var dd = new Y.DD.Drag({
                    node: element,
                    //It's a drop target too
                    target:{
                        padding: '0 0 0 0'
                    }
                })
                .plug(Y.Plugin.DDProxy, {
                    //Don't move the node at the end of the drag. This way it stays in its logical order,
                    //and not exactly where the proxy is dropped
                    moveOnEnd: false
                }).plug(Y.Plugin.DDConstrained, {
                    //The main node delimits the area where the user can do drag&drop
                    constrain2node: nodeId
                });

                //Element which fires the event (if passed)
                if(anchorNode)
                    dd.addHandle(anchorNode);

            });

            //Attach all the events necessary for the correct behavior of the plugin
            attachEvents();

        }

    };

    /************************** Private methods *******************************************/
    /**************************                 *******************************************/

    function attachEvents() {

        //drag:start event. It sets up styles to the drag node (where the user makes click), and
        //the proxy node, which is created until the user drops it again
        Y.DD.DDM.on('drag:start', function(e) {
            var drag = e.target;

            drag.get('node').setStyle('opacity', '.25');

            //proxy node
            drag.get('dragNode').set('innerHTML', drag.get('node').get('innerHTML'));
            drag.get('dragNode').setStyles({
                opacity: '.5'
            });

        });

        //drag:end event. It restores the original opacity to the draggable node
        Y.DD.DDM.on('drag:end', function(e) {
            var drag = e.target;

            drag.get('node').setStyles({
                opacity: '1'
            });
        });

        //drag:drag event. It detects if the node is being moved up or down.
        Y.DD.DDM.on('drag:drag', function(e) {
            //Get the last y point
            var y = e.target.lastXY[1];

            //is it greater than the lastY var?
            if (y < this._lastY) {
                //We are going up
                this._goingUp = true;
            } else {
                //We are going down.
                this._goingUp = false;
            }

          //Cache for next check
            this._lastY = y;
        });

        //drop:over. Detects the node we're over when dropping, to place the drag node in its correct place
        Y.DD.DDM.on('drop:over', function(e) {

            var drag = e.drag.get('node');
            var drop = e.drop.get('node');

            //Are we not going up?
            if (!this._goingUp) {
                drop = drop.get('nextSibling');
            }


            //Add the node to this list, in its correct position (before drop node)
            //If the drag node goes to the last place, drop is undefined, which works correctly
            //with insertBefore
            e.drop.get('node').get('parentNode').insertBefore(drag, drop);

            //Resize this nodes shim, so we can drop on it later.
            e.drop.sizeShim();

        });

    }


    /**************************                 *******************************************/
    /************************** Private methods *******************************************/


}, '0.0.1', {requires: ['plugin', 'node','dd-constrain', 'dd-proxy', 'dd-drop']});
