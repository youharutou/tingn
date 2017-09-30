## Tingn

Tingn.js can compile the template that is similar to twig.

template example:

```markdown
<ul>
    {% if !empty(goods) && !empty(emp) %}
    {% for good in goods %}
    <li class="item_box {% if good.is_fit == 1 && loop.last %}is_fit{% endif %}" data-index="{{loop.index}}">
        <span>{{good.goods_name}}</span>
        <span>{{good.goods_price}}</span>
        {% for attr in good.attrs %}
        <p class="attr_item" data-index="{{loop.index}}">{{attr.attr_name}}</p>
        {% endfor %}
        {% for ep in emp %}
        <div data-index="{{loop.index}}"><span>{{ep}}</span><span>{{loop.index}}</span></div>
        {% endfor %}
    </li>
    {% endfor %}
    {% else %}
    <li class="no_result">暂无记录</li>
    {% endif %}
</ul>
```
Tingn.js can compile the upper template and return result just like:

```markdown
<ul>
    <li class="item_box " data-index="0"><span>goods A</span> <span>18.00</span>
        <p class="attr_item" data-index="0">big</p>
        <p class="attr_item" data-index="1">small</p>
        <div data-index="0"><span>11</span><span>0</span></div>
        <div data-index="1"><span>22</span><span>1</span></div>
    </li>
    <li class="item_box " data-index="1"><span>goods B</span> <span>10.00</span>
        <p class="attr_item" data-index="0">hot</p>
        <p class="attr_item" data-index="1">cool</p>
        <div data-index="0"><span>11</span><span>0</span></div>
        <div data-index="1"><span>22</span><span>1</span></div>
    </li>
    <li class="item_box is_fit" data-index="2"><span>goods C</span> <span>28.00</span>
        <p class="attr_item" data-index="0">sugar</p>
        <p class="attr_item" data-index="1">no sugar</p>
        <div data-index="0"><span>11</span><span>0</span></div>
        <div data-index="1"><span>22</span><span>1</span></div>
    </li>
</ul>
```

### Usage

```
    var goods = [
        {goods_id: 2, goods_name: "goods A", goods_price: "18.00", is_fit: 0, attrs: [{attr_id: 1, attr_name: "big"}, {attr_id: 2, attr_name: "small"}]},
        {goods_id: 21, goods_name: "goods B", goods_price: "10.00", is_fit: 1, attrs: [{attr_id: 3, attr_name: "hot"}, {attr_id: 4, attr_name: "cool"}]},
        {goods_id: 47, goods_name: "goods C", goods_price: "28.00", is_fit: 1, attrs: [{attr_id: 5, attr_name: "sugar"}, {attr_id: 6, attr_name: "no sugar"}]}
    ];
    var emp = {"aa": 11, "bb": 22};
    Tingn("tpl.html", {
        data: {"goods": goods, "emp": emp}
    }, function(data){
        // data is the compiled results.
        $(".container").html(data);
    });
```

### Support or Contact


