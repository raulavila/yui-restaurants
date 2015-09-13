YUI().use('node', 'yql', 'drag-and-drop-plugin', 'autocomplete-base', 'autocomplete-filters', function(Y) {


    /************************** Configuration *******************************/
    /*******                                                         ********/

    var configuration = {

        //Maximum number of results retrieved in YQL queries
        maxResultsQuery : 100,

        //Maximum number of elements shown in each list of restaurants
        maxResultsShown : 5,

        //Location used in the query in order to look for restaurants
        location: 'los angeles, ca',

        //categories (array): title, title of the category
        //                    filter, to apply in the YQL query,
        //                    containerId, where the data is going to be shown
        categories: [
                  {title: 'Japanese Restaurants', filter: 'japanese', containerId: 'japanese-restaurants'},
                  {title: 'Korean Restaurants', filter: 'korean', containerId: 'korean-restaurants'},
                  {title: 'Indian Restaurants', filter: 'indian', containerId: 'indian-restaurants'}
                 ],

        //Messages
        msg:{
            titleAnchor: 'Click here to drag this category',
            notAvailable: 'Not Available'
        }

    };

    /*******                                                         ********/
    /************************** Configuration *******************************/


    //Incremented every time a category of restaurants is loaded,
    //   it's necessary to wait until all the categories are shown to make them draggable
    var categoriesLoaded = 0;


    /*
     * Creates a custom filter class that extends AutocompletBase
     * We do it here in order to create the class once, this class will be instantiated
     * in the method createFilter
     */
    var listFilter = Y.Base.create('listFilter', Y.Base, [Y.AutoCompleteBase], {
        initializer: function () {

            // The following two function calls allow AutoComplete to attach
            // events to the inputNode and manage the inputNode's browser
            // autocomplete functionality. (http://yuilibrary.com/yui/docs/autocomplete/)
            this._bindUIACBase();
            this._syncUIACBase();
        }
    });


    /************************************************************************************************************/
    /************************************************************************************************************/
    /************************************************************************************************************/


    /*
     * Initializes the page.
     */
    (function() {

        //Generate the different categories of restaurants
        createRestaurantCategories();

        //Hack for browsers that don't support placeholder attribute...
        Y.one('#filter-input').on('focus', function(e){
            if(e.target.get('value')=='Filter results...')
                e.target.set('value','');
        });

        //Calls to the method which retrieves the information (using YQL), and loads it into the lists
        Y.Array.each(configuration.categories, function (category) {
            queryRestaurantList(category.filter, category.containerId);
        });


    })();



    /*
     * Create the elements necessary to show a category of restaurants with its list, inside
     * #restaurant-categories container
     */
    function createRestaurantCategories()
    {

        Y.Array.each(configuration.categories, function (category) {

            var categoryContainer = Y.Node.create('<li id="'+category.containerId+'" class="draggable"></li>');

            var categoryTitle = Y.Node.create('<h3 class="restaurant-category-title"></h3>')
            //The image won't be a draggable-anchor until all the information is loaded
            categoryTitle.append('<img src="img/drag.png" class="draggable-anchor-disabled" alt="Drag" /> '+
                                             category.title);

            categoryContainer.append(categoryTitle);

            categoryContainer.append('<div class="loading"></div>');

            var categoryList = Y.Node.create('<ul class="restaurant-list hidden"></ul>');
            categoryList.append('<li class="no-results hidden">We haven\'t found any restaurant</li>');

            categoryContainer.append(categoryList);

            Y.Node.one('#restaurant-categories').append(categoryContainer);


        });

    }


    /*
     * Retrieves the data from the Restaurants, and represents it in a list, binding events, etc
     * @param filter             String with a filter (i.e. category of restaurant) to apply in the query
     * @param containerListId    Id of the container which contains the list where the
     *                           restaurants must be appended
     */
    function queryRestaurantList(filter, containerListId) {

        //The results are retrieved ordered by AverageRating (maximum rating first)
        Y.YQL('select * from local.search(0,'+configuration.maxResultsQuery+') '+
                ' where query = "'+filter+'" and location="'+configuration.location+'" '+
                '| sort(field="Rating.AverageRating") | reverse()', function(r) {

            //Get the list element of restaurants inside the container
            var restaurantList = Y.one('#'+containerListId+' .restaurant-list');

            //If there are results retrieved from local.search
            if(r.query.count>0) {
                var data = r.query.results.Result;

                Y.each(data, function(restaurantInfo, index) {

                    var restaurantNode = Y.Node.create('<li></li>');

                    restaurantNode.setHTML(restaurantInfo.Title);

                    //Stores the data of the restaurant in the li node, in order to show it later
                    restaurantNode.setData('data-info-restaurant', restaurantInfo);

                    //Binds click event on the node to showRestaurantData method
                    restaurantNode.on('click',showRestaurantData);

                    //Shows only the configuration.maxResultsShown first results. The rest of
                    //results are hidden.
                    if(index>=configuration.maxResultsShown) {
                        restaurantNode.addClass('hidden');
                    }

                    restaurantList.appendChild(restaurantNode);

                });
            }
            else {
                //If there are no results, show the li node with the text 'We he haven't found any restaurant'
                Y.one('#'+containerListId+' .restaurant-list li'+'.no-results').removeClass('hidden');
            }

            //Hide the loading icon
            Y.one('#'+containerListId+' .loading').addClass('hidden');

            //Show the list
            restaurantList.removeClass('hidden');

            //Create the filter associated to the list. When the user inputs a text in the input element
            //of the search-engine, this list is filtered
            createFilter('#'+containerListId+' .restaurant-list li');


            restaurantsLoadedCallback();

        });
    }


    /*
     * Tracks the number of categories loaded. It's necessary to wait until all of them
     * are shown to make the elements of the list draggable, and enable the filter-input element
     */
    function restaurantsLoadedCallback(){
        categoriesLoaded++;

        if(categoriesLoaded==configuration.categories.length){

            //First, we change the class of the disabled anchor images to 'draggable-anchor'
            Y.all('.draggable-anchor-disabled').each(function (node) {
                node.removeClass('draggable-anchor-disabled');
                node.addClass('draggable-anchor');
                node.set('title',configuration.msg.titleAnchor);
            });

            //#filter-input is disabled until all the info is shown too
            Y.one('#filter-input').removeAttribute("disabled");

            //Using the dragAndDropPlugin, converts into draggable all the elements in
            //the list of restaurant categories.
            var containerLists = Y.one('#restaurant-categories');
            containerLists.plug(Y.dragAndDropPlugin);
            containerLists.dragAndDrop.makeElementsDraggable('.draggable-anchor');
        }
    }


    /*
     * Shows the information of the selected restaurant in the box beside the search engine
     * @param e     Event object
     */
    function showRestaurantData(e) {

        //Retrieve the data stored in the node
        var restaurant = e.target.getData('data-info-restaurant');

        //Show it!
        Y.one('#title').setHTML(restaurant.Title);
        Y.one('#address').setHTML(restaurant.Address);
        Y.one('#phone').setHTML(restaurant.Phone);

        //Sometimes the text NaN is stored in this field
        if(restaurant.Rating.AverageRating!='NaN')
            Y.one('#rating').setHTML(restaurant.Rating.AverageRating);
        else
            Y.one('#rating').setHTML(configuration.msg.notAvailable);

        var restaurantLink = Y.Node.create('<a></a>');
        restaurantLink.set('href',restaurant.Url);
        restaurantLink.set('target','_blank');
        restaurantLink.setHTML(restaurant.Url);

        var link = Y.one('#link');
        link.setHTML(restaurantLink);

    }


    /*
     * Creates a filter which shows only the elements corresponding to the text introduced in
     * input element '#filter-input'. Reference (http://yuilibrary.com/yui/docs/autocomplete/ac-filter.html)
     *
     * @param filterElements       Elements to filter. In this application they are
     *                             li nodes of every list of restaurants
     *
     */
    function createFilter(filterElements) {

        var filter = new listFilter({
            //node where the user inputs the text to filter
            inputNode: '#filter-input',

            //no minimum number of characters to start filtering
            minQueryLength: 0,

            //no need to wait to trigger the query event, the results will be stored in a local array!
            queryDelay: 0,

            //Invokes an anonymous function that returns an array of results to use
            //as source for the queries
            source: (function () {
                var results = [];

                //The array of results is composed by the texts of all the filterElements (li nodes)
                Y.all(filterElements).each(function (node) {

                    //no-results node is not used for queries, of course
                    if (!node.hasClass('no-results')){
                        results.push({
                            node: node,
                            text: node.get('innerHTML')
                        });
                    }
                });

                return results;
            }()),

            //The text property of each result object contains the text to filter on
            resultTextLocator: 'text',

            //Use phraseMatch filter (from autocomplete-filters) to filter the results
            resultFilters: 'phraseMatch'
        });

        //On results event, show the nodes filtered
        filter.on('results', function (e) {

            //First, hide all the elements
            Y.all(filterElements).addClass('hidden');

            //Unhide the configuration.maxResultsShown first nodes that are in the current result list
            Y.Array.some(e.results, function (result, index) {

                result.raw.node.removeClass('hidden');

                //Once we have shown configuration.maxResultsShown elements, we stop looping
                if(index+1==configuration.maxResultsShown)
                    return true;
                else
                    return false;


            });

            //If there are no results, show no-results element
            if (e.results.length==0) {
                Y.one(filterElements+'.no-results').removeClass('hidden');
            }


        });

    }

});
