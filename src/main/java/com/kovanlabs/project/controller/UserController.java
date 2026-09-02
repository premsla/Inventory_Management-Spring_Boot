package com.kovanlabs.project.controller;
import com.kovanlabs.project.model.Role;
import com.kovanlabs.project.model.User;
import com.kovanlabs.project.dto.UserDTO;
import com.kovanlabs.project.service.UserService;

import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@CrossOrigin("http://localhost:5173")
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return Collections.emptyList();
    }

    @PostMapping("/register-owner")
    public Object registerOwner(@RequestBody UserDTO dto) {
        return userService.registerOwner(dto, Role.OWNER);
    }

}