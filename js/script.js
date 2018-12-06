/**
 * Clicker Game for NNMDEV
 * Игра кликер
 *
 * @author Maks Visyagin
 * @version 1.0
 * @date 17.11.2018
 *
 */

(function(){

    /* Уровень 
     * 
     * @params null
     * @returns null
     */
    function Layer() {
        console.log("New layer");
    }

    /* Загрузчик картинок 
    *
    * @params null
    * @returns null
    */
    Layer.prototype.loader = function () {
        console.log("Loader");

        var self = this,
            loader = PIXI.loader,
            assetList = [ // Cписок изображений
                {"name": "fon", url: "images/fon.jpg"},
                {"name": "panel_with_line", url: "images/panel_with_line.jpg"},
                {"name": "start_btn", url: "images/start_btn.png"},
                {"name": "win", url: "images/win.png"},
                {"name": "coin", url: "images/coin.png"},
                {"name": "fabric", url: "images/fabric.png"},
                {"name": "factory", url: "images/factory.png"},
            ];

        loader.add( assetList ); // Отправляем список изображений в загрузчик
        loader.once('complete', function(e){
            self.init(); // По завершению - инициализировать уровень
        }).load();

    };

    /* Инициализация уровня 
    *
    *  @params null
    *  @returns null
    */
    Layer.prototype.init = function () {
        console.log("Layer init");

        var self = this;

        // Настройки
        this.stage = new PIXI.Container(0x000000, true);

        this.TextureCache = PIXI.utils.TextureCache;

        this.viewWidth = 1024;
        this.viewHeight = 800;

        this.gameFieldWidth = this.viewWidth;
        this.gameFieldHeight = this.viewHeight - this.TextureCache["images/panel_with_line.jpg"].height;

        this.gameFieldPadding = 30; // Отступы на игровом поле
        this.buttonPadding = 10; // Отступы у кнопок
        this.counterPadding = 60; // Отступы у счётчика монет

        this.money = 10; // Стартовое кол-во монет
        this.moneyTarget = 500; // Цель игры
        this.buildMoneyFromPlayerTrigger = 0;

        this.ticker = PIXI.ticker.shared; // Глобальный таймер
        this.renderer = PIXI.autoDetectRenderer( this.viewWidth, this.viewHeight  );

        this.fabricMax = 10; // Макс кол-во фабрик
        this.factoryMax = 5; // Макс кол-во заводов

        this.fabricArr = [];
        this.factoryArr = [];

        this.fabricPrice = 20;
        this.factoryPrice = 70;

        this.fabricPositions = [ // Слоты Фабрик
            { x: 100, y: 300},
            { x: 270, y: 300},
            { x: 440, y: 300},
            { x: 610, y: 300},
            { x: 780, y: 300},

            { x: 100, y: 450},
            { x: 270, y: 450},
            { x: 440, y: 450},
            { x: 610, y: 450},
            { x: 780, y: 450},
        ];
        self.factoryPositions = [// Слоты Заводов
            { x: 100, y: 100},
            { x: 270, y: 100},
            { x: 440, y: 100},
            { x: 610, y: 100},
            { x: 780, y: 100},
        ];

        this.ticker.stop(); // Ждём старта игры

        document.body.appendChild( this.renderer.view );

        this.stage.addChild( PIXI.Sprite.fromImage("images/fon.jpg") ); // Фон

        // Панель
        var panel = PIXI.Sprite.fromImage("images/panel_with_line.jpg");
        panel.position.y = self.viewHeight - this.TextureCache["images/panel_with_line.jpg"].height;
        this.stage.addChild( panel );


        // Кроссбраузерная поддержка requestAnimationFrame
        window.requestAnimFrame = function(){
            return (
                window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                function( step ){
                    window.setTimeout(step, 1000 / 60);
                }
            );
        }();

        // Set Timer
        var newDate = new Date();
        self.tickerStarted = newDate;
        self.ticker.update( newDate );

        // Кнопка запуска игры
        var startBtn = new PIXI.Sprite.fromImage("images/start_btn.png");
        startBtn.interactive = true;
        startBtn.buttonMode = true;
        startBtn.anchor.set(0.5);
        startBtn.position.set(self.viewWidth/2, self.viewHeight /2 );
        var startBtnEl = this.stage.addChild( startBtn );

        startBtn.click  = startBtn.tap = function(event){
            var startBtnId = layer.stage.getChildIndex( startBtnEl );
            self.stage.removeChildAt(startBtnId);

            self.startGame(step); // Запуск игры
        }

        // Рендерим сцену
        self.renderer.render( self.stage );

        // Фрейм
        function step(time) {
            if (self.ticker.started){
                // timer
                self.ticker.autoStart = false;
                self.forceCurrentTime = self.ticker.lastTime + (1000.0 / 60.0);
                self.currentTime = performance.now();
                self.ticker.update( new Date() );

                // Проверка генерации монет от игрока
                self.checkPlayerGenerate();

                // Проверка генерации монет от фабрик
                self.checkFabricGenerate();

                // Проверка генерации монет от заводов
                self.checkFactoryGenerate();

                // Обновляем счётчик монет
                self.drawCounter( self.money );

                // Проверяем достижение цели
                self.checkWin();

                // Рендерим уровень
                self.renderer.render( self.stage );

                // Следующий фрейм
                requestAnimationFrame( step );
            }
        }


    };

    /* Наведение мышьки на кнопки 
    *
    * @params {Event} e
    * @returns null
    */
    Layer.prototype.mouseOverEvent = function (e) {
        this.scale.set(1.1);
    }
    Layer.prototype.mouseOutEvent = function (e) {
        this.scale.set(1);
    }
    /* Фильтр пикселизация 
    *
    *  @params {Int} size
    *  @returns null
    */
    Layer.prototype.setPixelateFilter = function (size) {
        var self = this;

        var pixelateFilter = new PIXI.filters.PixelateFilter();
        pixelateFilter.size= {
            x: size,
            y: size
        };

        this.stage.filters = [ pixelateFilter ];
        this.renderer.render( self.stage );
    }

    /* Инициализация графического инетрфейса
    * 
    *  @params null
    *  @returns null
    */
    Layer.prototype.initGUI = function () {
        var self = this;

        // Кнопка добавления Фабрики
        var fabricBtn = new PIXI.Sprite.fromImage("images/fabric.png");
        fabricBtn.interactive = true;
        fabricBtn.buttonMode = true;
        fabricBtn.anchor.set(0.5);
        fabricBtn.position.set(100, ( self.viewHeight - this.TextureCache["images/fabric.png"].height/2) - self.buttonPadding );

        fabricBtn.click  = fabricBtn.tap = function(event){
            self.addFabric();
        }
        fabricBtn.mouseover = this.mouseOverEvent;
        fabricBtn.mouseout = this.mouseOutEvent;

        this.stage.addChild( fabricBtn );


        // Кнопка добавления Завода
        factoryBtn = new PIXI.Sprite.fromImage("images/factory.png");
        factoryBtn.interactive = true;
        factoryBtn.buttonMode = true;
        factoryBtn.anchor.set(0.5);
        factoryBtn.position.set(500, ( self.viewHeight - this.TextureCache["images/factory.png"].height/2) - self.buttonPadding);

        factoryBtn.click = factoryBtn.tap = function(event){
            self.addFactory();
        }

        factoryBtn.mouseover = this.mouseOverEvent;
        factoryBtn.mouseout = this.mouseOutEvent;

        this.stage.addChild( factoryBtn );

        //Монеты на панеле
        coinInd = new PIXI.Sprite.fromImage("images/coin.png");
        coinInd.anchor.set(0.5);
        coinInd.position.set( 830, (self.viewHeight - this.TextureCache["images/coin.png"].height) - self.buttonPadding/2);
        this.stage.addChild( coinInd );

        this.moneyCountText = new PIXI.Text(10, {font : '32px Arial', fill : 0xffe03a, align : 'right'});
        this.moneyCountText.position.set( self.viewWidth - this.moneyCountText.width - self.counterPadding, self.viewHeight  - this.moneyCountText.height - self.counterPadding);
        this.stage.addChild( this.moneyCountText );

    }

    Layer.prototype.startGame = function (step) {
        var self = this;

        this.initGUI();

        console.log( 'GAME STARTED: ' + this.tickerStarted );

        // Запускаем анимацию
        this.ticker.start();
        requestAnimationFrame( step );
    }

    /* Проверка достижения цели 
    *  
    *  @params {Int} money
    *  @returns null
    */
    Layer.prototype.checkWin = function (money) {
        var self = this;

        if ( self.money >= this.moneyTarget ){
            // Победа
            var winImg = new PIXI.Sprite.fromImage("images/win.png");
            winImg.anchor.set(0.5);
            winImg.position.set( self.viewWidth/2, self.viewHeight/2 );
            this.stage.addChild( winImg );

            this.ticker.stop();
        }
    }

    /* Генерация монет Игроком 
    *  
    *  @params {Int} money
    *  @returns null
    */
    Layer.prototype.checkPlayerGenerate = function (money) {
        var self = this;

        var delta = self.ticker.lastTime.getTime() - layer.tickerStarted.getTime(),
            delta_seconds =  new Date(delta).getSeconds();

        var checkMoneyFromPlayer = Math.floor(delta_seconds/5) ;
        if ( (checkMoneyFromPlayer > 0) && (checkMoneyFromPlayer != self.buildMoneyFromPlayerTrigger) ){
            // console.log( ' spawn money:    ' + self.ticker.lastTime );
            self.buildMoneyFromPlayerTrigger = checkMoneyFromPlayer;
            self.spawnMoney();
        }
    }

    /* Генерация монет Фабриками 
    *  
    *  @params {Int} money
    *  @returns null
    */
    Layer.prototype.checkFabricGenerate = function (money) {
        var self = this;
        var fabricCount = this.fabricArr.length;

        if (fabricCount){
            for (var fabric = 0, fabricCount = this.fabricArr.length; fabric < fabricCount; fabric++){

                var delta = self.ticker.lastTime.getTime() - this.fabricArr[fabric]['time'].getTime(),
                    delta_seconds =  new Date(delta).getSeconds();

                var checkMoneyFromFabric = Math.floor(delta_seconds/5) ;
                var buildMoneyFromFabricTrigger = this.fabricArr[fabric]['trigger'];

                if ( (checkMoneyFromFabric > 0) && (checkMoneyFromFabric != buildMoneyFromFabricTrigger) ){

                    this.fabricArr[fabric]['trigger'] = checkMoneyFromFabric;
                    //self.money ++;
                    self.spawnMoney();
                    console.log( ' 1 money from fabric:    ' + self.ticker.lastTime );
                }

            }
        }

    }

    /* Генерация монет Заводами
    *  
    *  @params {Int} money
    *  @returns null
    */
    Layer.prototype.checkFactoryGenerate = function (money) {

        var self = this;
        var factoryCount = this.factoryArr.length;

        if (factoryCount){
            for (var factory = 0, factoryCount = this.factoryArr.length; factory < factoryCount; factory++){

                var delta = self.ticker.lastTime.getTime() - this.factoryArr[factory]['time'].getTime(),
                    delta_seconds =  new Date(delta).getSeconds();

                var checkMoneyFromfactory = Math.floor(delta_seconds/5) ;
                var buildMoneyFromfactoryTrigger = this.factoryArr[factory]['trigger'];

                if ( (checkMoneyFromfactory > 0) && (checkMoneyFromfactory != buildMoneyFromfactoryTrigger) ){

                    this.factoryArr[factory]['trigger'] = checkMoneyFromfactory;
                    //self.money += 2;
                    self.spawnMoney();
                    self.spawnMoney();
                    console.log( ' 2 money from factory:    ' + self.ticker.lastTime );
                }

            }
        }


    }

    /* Счётчик монет 
    *  
    *  @params {Int} money
    *  @returns null
    */
    Layer.prototype.drawCounter = function (money) {
        this.moneyCountText.text = money;
    }

    /* Покупка Фабрики 
    *  
    *  @params null
    *  @returns null
    */
    Layer.prototype.addFabric = function () {
        // console.log("addFabric");

        var self = this;
        var fabricCount = this.fabricArr.length;

        if( fabricCount < this.fabricMax){
            if( this.money < this.fabricPrice){
                alert('Недостаточно монет! Необходимо: '+this.fabricPrice);
            } else {
                this.money -= this.fabricPrice; // Покупка

                var fabric = new PIXI.Sprite.fromImage("images/fabric.png");

                fabric.position = {
                    x: self.fabricPositions[fabricCount]['x'],
                    y: self.fabricPositions[fabricCount]['y']
                }
                var fabricObj = {
                    time: self.ticker.lastTime, // Время создания фабрики
                    trigger: 0
                }
                this.fabricArr.push( fabricObj );
                this.stage.addChild( fabric );

                console.log("fabric created");
            }
        } else {
            alert('Достигнуто максимальное кол-во фабрик!');
        }
    }

    /* Покупка Завода
    *  
    *  @params null
    *  @returns null
    */
    Layer.prototype.addFactory = function () {
        // console.log("addFactory");

        var self = this;
        var fabricCount = this.fabricArr.length;
        var factoryCount = this.factoryArr.length;

        if( fabricCount < 1){
            alert('Необходимо построить хотя бы одну фабрику!');
        } else {
            if( factoryCount < this.factoryMax){
                if( this.money < this.factoryPrice){
                    alert('Недостаточно монет! Необходимо: '+this.factoryPrice);
                } else {
                    this.money -= this.factoryPrice; // Покупка

                    var factory = new PIXI.Sprite.fromImage("images/factory.png");

                    factory.position = {
                        x: self.factoryPositions[factoryCount]['x'],
                        y: self.factoryPositions[factoryCount]['y']
                    }
                    var factoryObj = {
                        time: self.ticker.lastTime, // Время создания фабрики
                        trigger: 0
                    }
                    this.factoryArr.push( factoryObj );
                    this.stage.addChild( factory );

                    console.log("factory created");
                }
            } else {
                alert('Достигнуто максимальное кол-во заводов!');
            }
        }
    }

    /* Генерация монеты на поле 
    *  
    *  @params null
    *  @returns null
    */
    Layer.prototype.spawnMoney = function () {
        // console.log("spawnMoney");

        var self = this;

        var coin = new PIXI.Sprite.fromImage("images/coin.png");
        coin.interactive = true;
        coin.buttonMode = true;
        coin.scale.set(0.7);
        coin.anchor.set(0.5);
        coin.position.set( this.generateRandomX(), this.generateRandomY() );

        var coinEl = this.stage.addChild( coin );

        // Обработчик сбора монет
        coin.click = coin.tap = function(event){
            var coinId = layer.stage.getChildIndex( coinEl );
            coin.visible = false;
            self.money++;
            layer.stage.removeChildAt(coinId);
            console.log( ' 1 money from Player:    ' + self.ticker.lastTime );
        }

    }

    /* Генерация позиции монеты по x */
    Layer.prototype.generateRandomX = function () {
        var x = -1;

        while ( x < this.gameFieldPadding || x > this.gameFieldWidth-this.gameFieldPadding ) {
            x = Math.random() * 10000;
        }
        return x;
    }

    /* Генерация позиции монеты по y 
    *  
    *  @params null
    *  @returns null
    */
    Layer.prototype.generateRandomY = function () {
        var y = -1;

        while ( y < this.gameFieldPadding || y > this.gameFieldHeight-this.gameFieldPadding ) {
            y = Math.random() * 10000;
        }
        return y;
    }

    /* Ждём загрузку DOM
    *  
    *  @params null
    *  @returns null
    */
    document.onreadystatechange = function () {
        if (document.readyState == 'complete') {

            // Создаём сцену
            window.layer = new Layer;
            window.layer.loader();

        }
    }

})();