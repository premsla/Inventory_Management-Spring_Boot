package com.kovanlabs.project.service;

import com.kovanlabs.project.dto.LoginDTO;
import com.kovanlabs.project.dto.UserDTO;
import com.kovanlabs.project.model.*;
import com.kovanlabs.project.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final BusinessRepository businessRepository;
    private final BranchRepository branchRepository;

    public UserService(UserRepository userRepository,
                       BusinessRepository businessRepository,
                       BranchRepository branchRepository) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.branchRepository = branchRepository;
    }

    public User registerOwner(UserDTO dto, Role role) {
        Business business = businessRepository.findById(dto.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found"));

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setPassword(dto.getPassword());
        user.setRole(role);
        user.setBusiness(business);
        user.setBranch(null);

        return userRepository.save(user);
    }

    public User login(LoginDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!dto.getPassword().equals(user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        if (user.getRole() != Role.OWNER) {
            throw new RuntimeException("Not an owner");
        }

        return user;
    }

    public User loginAnyRole(LoginDTO dto) {
        User user = userRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!dto.getPassword().equals(user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return user;
    }

    @Transactional
    public User registerBranchUserByOwner(UserDTO dto, Role role, String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("Owner user not found"));

        if (owner.getRole() != Role.OWNER) {
            throw new RuntimeException("Only owner can create manager/staff");
        }

        // Default to owner's business if not provided
        Long businessId = dto.getBusinessId();
        if (businessId == null && owner.getBusiness() != null) {
            businessId = owner.getBusiness().getId();
        }

        if (businessId == null) {
            throw new RuntimeException("businessId is required");
        }

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Business not found"));

        if (owner.getBusiness() == null || !owner.getBusiness().getId().equals(business.getId())) {
            throw new RuntimeException("Owner can only create users for their own business");
        }

        Branch branch = null;
        if (dto.getBranchId() != null) {
            branch = branchRepository.findById(dto.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found"));

            if (branch.getBusiness() == null || !branch.getBusiness().getId().equals(business.getId())) {
                throw new RuntimeException("Branch does not belong to this business");
            }
        }

        if (userRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setPassword(dto.getPassword());
        user.setRole(role);
        user.setBusiness(business);
        user.setBranch(branch);

        return userRepository.save(user);
    }

    public User createBranchManager(UserDTO dto) {
        Business business = businessRepository.findById(dto.getBusinessId())
                .orElseThrow(() -> new RuntimeException("Business not found for ID: " + dto.getBusinessId()));

        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new RuntimeException("Branch not found for ID: " + dto.getBranchId()));

        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setPassword(dto.getPassword());
        user.setRole(Role.MANAGER);
        user.setBusiness(business);
        user.setBranch(branch);

        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public List<User> getAllUsers(Long businessId) {
        return userRepository.findByBusinessId(businessId);
    }
}