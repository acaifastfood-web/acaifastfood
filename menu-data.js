(function () {
  const products = [];

  function add(category, name, price, variant = "", icon = "•", productionCenter = "") {
    const slug = `${category}-${name}-${variant}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    products.push({ id: slug, category, name, variant, price, icon, productionCenter });
  }

  add("Açaí", "Açaí P", 5, "250 ml · inclui até 4 complementos, 2 frutas e 2 toppings", "🥣", "Açaí");
  add("Açaí", "Açaí M", 7, "360 ml · inclui até 4 complementos, 2 frutas e 2 toppings", "🥣", "Açaí");
  add("Açaí", "Açaí G", 14.5, "800 ml · inclui até 4 complementos, 2 frutas e 2 toppings", "🥣", "Açaí");
  add("Açaí", "Açaí Jumbo", 22, "1200 ml · inclui até 4 complementos, 2 frutas e 2 toppings", "🥣", "Açaí");

  add("Combos", "Combo Burger", 12, "Burger + batatas + sumo ou açaí 250 ml", "🍔", "Cozinha");
  add("Combos", "Combo Hot Dog", 12, "Hot dog + batatas + sumo ou açaí 250 ml", "🌭", "Cozinha");
  add("Combos", "Combo Tapioca", 12, "Tapioca + sumo ou açaí 250 ml", "🌮", "Cozinha");
  add("Combos", "Combo Pastel", 12, "Pastel + sumo ou açaí 250 ml", "🥟", "Cozinha");
  add("Combos", "Combo X-Tudo", 17, "X-Tudo + batatas + sumo ou açaí 250 ml", "🍔", "Cozinha");
  add("Combos", "Combo Mega", 27, "10 salgados, 1 Double, 1 X-Bacon, 2 batatas, 2 sumos e 2 açaís 250 ml", "🍽️", "Cozinha");
  add("Combos", "Combo Mega Family", 45, "10 salgados, 4 X-Bacon, 4 batatas, 4 sumos e 4 açaís 250 ml", "👨‍👩‍👧‍👦", "Cozinha");
  add("Combos", "Alterar açaí do combo para M", 1.5, "Adicional por cada açaí", "+", "Açaí");
  add("Combos", "Adicionar 10 salgados ao combo", 5, "Adicional", "+", "Cozinha");

  add("Entradas", "Porção 4 unidades", 2.5, "Stickers de queijo ou nuggets de frango", "🍗", "Cozinha");
  add("Entradas", "Empada", 2.8, "Unidade", "🥧", "Cozinha");
  add("Entradas", "Kibe tradicional", 2.8, "Unidade", "🥟", "Cozinha");
  add("Entradas", "Kibe recheado", 3, "Unidade", "🥟", "Cozinha");
  add("Entradas", "Coxinha tradicional", 3, "Unidade", "🍗", "Cozinha");
  add("Entradas", "Batatas fritas", 3, "Porção", "🍟", "Cozinha");
  add("Entradas", "Asinhas de frango", 5, "8 unidades", "🍗", "Cozinha");
  add("Entradas", "Aros de cebola", 5.5, "12 unidades", "🧅", "Cozinha");
  add("Entradas", "Nuggets", 5.5, "12 unidades", "🍗", "Cozinha");
  add("Entradas", "Mini salgados", 2.5, "4 unidades · coxinhas ou diversos", "🥟", "Cozinha");
  add("Entradas", "Mini salgados", 5, "9 unidades · coxinhas ou diversos", "🥟", "Cozinha");
  add("Entradas", "Mini salgados", 7.5, "15 unidades · coxinhas ou diversos", "🥟", "Cozinha");

  add("Petiscos", "Moelas", 6, "Porção com torradas", "🍲", "Cozinha");
  add("Petiscos", "Carne do Sol", 9, "Batatas fritas e salada", "🥩", "Cozinha");
  add("Petiscos", "Arrumandinho", 10, "Feijão frade, bacon, carne do sol, calabresa, farofa e salada", "🍛", "Cozinha");
  add("Petiscos", "Calabresa acebolada", 7.5, "Com mandioca frita", "🌭", "Cozinha");
  add("Petiscos", "Espetos de queijo coalho", 7, "Porção", "🧀", "Cozinha");
  add("Petiscos", "Batatas com cheddar e bacon", 5, "Porção", "🍟", "Cozinha");
  add("Petiscos", "Tábua de petiscos", 15, "Batatas, calabresa, salgados, asinhas, aros e molhos", "🍽️", "Cozinha");
  add("Petiscos", "Purê de mandioca com carne do sol", 15, "Acompanha salada vinagrete", "🍲", "Cozinha");

  add("Tostas", "Tosta de queijo com fiambre", 4, "Unidade", "🥪", "Cozinha");
  add("Tostas", "Tosta de pasta de frango", 4, "Unidade", "🥪", "Cozinha");
  add("Tostas", "Tosta de bacon com queijo", 4, "Unidade", "🥪", "Cozinha");
  add("Tostas", "Tosta de atum", 4, "Unidade", "🥪", "Cozinha");

  add("Extras", "Carne de hambúrguer", 2.5, "Cada", "+", "Cozinha");
  add("Extras", "Extra", 1, "Cada", "+", "Cozinha");
  add("Extras", "Molho", 0.15, "Cada", "+", "Cozinha");
  add("Extras", "Maionese de ervas, cheddar ou BBQ", 0.5, "Cada", "+", "Cozinha");

  [
    "Chocolate com proteína", "Morango com proteína", "Paçoca", "Ninho com morango e topping de avelã",
    "Açaí com banana", "Açaí com banana e proteína", "Banana, morango e chia", "Ovomaltine",
  ].forEach((name) => add("Batidos", name, 5.2, "Batido especial", "🥤", "Açaí"));
  ["Chocolate", "Morango", "Oreo", "Banana", "Açaí", "KitKat"].forEach((name) => add("Batidos", `Batido de ${name}`, 4.5, "Batido clássico", "🥤", "Açaí"));

  add("Bebidas", "Água", 1, "50 cl", "💧", "Balcão");
  add("Bebidas", "Água das Pedras", 2, "Garrafa", "💧", "Balcão");
  add("Bebidas", "Água Castelo", 2, "Garrafa", "💧", "Balcão");
  add("Bebidas", "Sumo natural", 3, "Consultar sabores disponíveis", "🍹", "Açaí");
  add("Bebidas", "Ice Tea", 2, "Lata", "🥤", "Balcão");
  add("Bebidas", "Pepsi / Cola / Fanta", 2, "Lata", "🥤", "Balcão");
  add("Bebidas", "Café", 1, "Unidade", "☕", "Balcão");
  add("Bebidas", "Meia de leite / Galão / Chá", 1.5, "Unidade", "☕", "Balcão");
  add("Bebidas", "Chocolate quente", 2.5, "Unidade", "☕", "Balcão");
  add("Bebidas", "Super Bock", 1.6, "Imperial ou mini", "🍺", "Balcão");
  add("Bebidas", "Super Bock", 2.8, "Caneca", "🍺", "Balcão");
  add("Bebidas", "Somersby", 3, "33 cl", "🍺", "Balcão");
  add("Bebidas", "Heineken", 2, "Garrafa", "🍺", "Balcão");
  add("Bebidas", "Vinho Verde", 2.5, "Copo", "🍷", "Balcão");
  add("Bebidas", "Energético", 3, "Lata", "⚡", "Balcão");

  add("Hambúrgueres", "X-Tudo", 12, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Big Burguer", 10, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "À Nossa Moda", 8.7, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Double Bacon", 8.7, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Cheesebacon", 7, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Cheeseburguer", 6.5, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Vegetariano", 5.5, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Galo Carijó", 5.5, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Hambúrguer", 5.5, "Inclui batata frita e bebida", "🍔", "Cozinha");
  add("Hambúrgueres", "Menu Kids", 5, "Inclui batata frita e bebida", "🍔", "Cozinha");

  add("Hot Dog", "Hot Dog tradicional", 3, "Salsicha, ketchup, maionese e batata palha", "🌭", "Cozinha");

  const tapiocas = [
    ["Queijo", 5], ["Queijo com orégãos", 5], ["Queijo com tomate e orégãos", 5], ["Queijo com fiambre", 5],
    ["Frango", 5], ["Frango com queijo", 5], ["Frango com milho e queijo", 5], ["Carne com queijo", 5],
    ["Carne com milho e queijo", 5], ["Chouriço com queijo", 5], ["Bacon com cheddar", 5], ["Pizza", 5],
    ["Especial", 5.5], ["Frango ou carne com Philadelphia", 5.5], ["Frango ou carne com Philadelphia e bacon", 5.5],
    ["Palmito com azeitonas", 5.5], ["Atum com queijo e milho", 5.5], ["Pepperoni com queijo", 5.5],
    ["Goiabada com queijo", 5.5], ["Doce de leite com queijo", 5.5], ["Morango com leite condensado", 5.5],
    ["Morango com Nutella", 5.5], ["Queijo, leite condensado e coco", 5.5],
  ];
  tapiocas.forEach(([name, price]) => add("Tapiocas", `Tapioca de ${name}`, price, "Unidade", "🌮", "Cozinha"));

  const pasteis = [
    ["Queijo", 3.5], ["Queijo com orégãos", 3.5], ["Queijo com tomate e orégãos", 3.5], ["Queijo com fiambre", 3.5],
    ["Frango", 3.5], ["Frango com queijo", 3.5], ["Frango com milho e queijo", 3.5], ["Carne com queijo", 3.5],
    ["Carne com milho e queijo", 3.5], ["Chouriço com queijo", 3.5], ["Bacon com cheddar", 3.5], ["3 queijos", 4],
    ["Pizza", 4], ["Frango ou carne com Philadelphia", 4], ["Frango ou carne com Philadelphia e bacon", 4],
    ["Palmito com azeitonas", 4], ["Atum com queijo e milho", 4], ["Pepperoni com queijo", 4],
    ["Goiabada com queijo", 4], ["Doce de leite com queijo", 4],
  ];
  pasteis.forEach(([name, price]) => add("Pastéis", `Pastel de ${name}`, price, "Unidade", "🥟", "Cozinha"));

  window.ACAI_MENU = products;
})();
