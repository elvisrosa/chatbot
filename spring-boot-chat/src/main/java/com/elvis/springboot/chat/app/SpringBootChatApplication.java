package com.elvis.springboot.chat.app;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;

@SpringBootApplication
public class SpringBootChatApplication {

	public static void main(String[] args) {
		new SpringApplicationBuilder(SpringBootChatApplication.class).run(args);

		// new SpringApplicationBuilder(SpringBootChatApplication.class)
		// .initializers(new MongoContainerInitializer())
		// .run(args);

	}

}
